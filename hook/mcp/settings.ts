import { boundedPage, MAX_LIST_LIMIT } from './pagination';

declare const mcp: any;

// Setting values are arbitrary JSON blobs (module configs, worktime tables,
// cached payloads). The list view only needs to show what a value looks like —
// anything bigger is replaced by a marker and can be read with settings-get.
const MAX_LIST_VALUE_CHARS = 2000;

const SENSITIVE_FIELDS = new Set([
    'private_key', 'private_key_id', 'password', 'secret', 'api_key', 'apiKey',
    'token', 'access_token', 'refresh_token', 'client_secret',
]);

function maskSensitiveValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object' || Array.isArray(value)) return value;
    const masked: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
        masked[k] = SENSITIVE_FIELDS.has(k) ? '***' : v;
    }
    return masked;
}

/**
 * A setting flagged `secret` holds a token/password/key: it lives in the DB only
 * and is never disclosed, not even to an operator-driven model. It stays settable
 * (settings-set writes it), so only the readout is replaced by this marker.
 */
const SECRET_PLACEHOLDER = '[secret — stored, never disclosed]';

function maskSettingValue(setting: any, value: any): any {
    if (setting?.secret) return value === null || value === undefined ? null : SECRET_PLACEHOLDER;
    return maskSensitiveValue(value);
}

function shrinkListValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    let serialized: string;
    try {
        serialized = typeof value === 'string' ? value : JSON.stringify(value);
    } catch (e) {
        return '[unserializable value — use settings-get]';
    }
    if (!serialized || serialized.length <= MAX_LIST_VALUE_CHARS) return value;
    return `[value omitted: ${serialized.length} chars — use settings-get for the full value]`;
}

export function registerSettingsTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'settings-list',
        group: 'settings',
        description:
            'Returns settings with key, current value, type, description and jsonSchema. Read this before calling settings-set to understand what can be changed and what format is expected.\n\n'
            + `Returns { total, skip, limit, items }. Paginated: use skip+limit (default and hard cap ${MAX_LIST_LIMIT}) — compare items.length with total to see if another page is needed. Values longer than ${MAX_LIST_VALUE_CHARS} chars are replaced by a marker — fetch them with settings-get.`,
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                module: { type: 'string',  description: 'Filter by module name.', example: 'core' },
                limit:  { type: 'integer', description: `Page size (default and hard cap ${MAX_LIST_LIMIT}).`, example: 200 },
                skip:   { type: 'integer', description: 'Offset. Use skip=N*limit for page N.', example: 0 },
            },
        },
        handler: async (params: { module?: string; limit?: number; skip?: number }) => {
            const criteria: any = params.module ? { module: params.module } : {};
            // Settings rows are small once oversized values are shrunk, so the
            // page defaults to the cap: most installs fit in a single call.
            const { limit, skip } = boundedPage(params.limit, params.skip, { defaultLimit: MAX_LIST_LIMIT });
            const [total, settings] = await Promise.all([
                Settings.count(criteria),
                Settings.find(criteria).limit(limit).skip(skip).sort('key ASC'),
            ]);
            const items = settings.map((s: any) => {
                const rawValue = s.value ?? s.defaultValue ?? null;
                const rawDefault = s.defaultValue ?? null;
                return {
                    key: s.key,
                    value: shrinkListValue(maskSettingValue(s, rawValue)),
                    defaultValue: shrinkListValue(maskSettingValue(s, rawDefault)),
                    type: s.type,
                    name: s.name,
                    description: s.description ?? null,
                    readOnly: s.readOnly ?? false,
                    secret: s.secret ?? false,
                    restartRequired: s.restartRequired ?? false,
                    module: s.module ?? null,
                };
            });
            return { total, skip, limit, items };
        },
    });

    mcp.registerTool({
        name: 'settings-get',
        group: 'settings',
        description: 'Returns a single setting by key. Includes current value, default, type, description and jsonSchema (validation rules).',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'Setting key, e.g. "DELIVERY_COST".', example: 'DELIVERY_COST' },
            },
            required: ['key'],
        },
        handler: async ({ key }: { key: string }) => {
            const normalized = key.toUpperCase().replace(/ /g, '_');
            const s = await Settings.findOne({ key: normalized });
            if (!s) throw new Error(`Setting "${key}" not found`);
            return {
                ...s,
                value: maskSettingValue(s, s.value),
                defaultValue: maskSettingValue(s, s.defaultValue),
            };
        },
    });

    mcp.registerTool({
        name: 'settings-set',
        group: 'settings',
        description:
            'Updates a setting value. Value is validated against jsonSchema before saving.\n\n'
            + 'Call settings-get first to see the expected type and schema.\n\n'
            + 'Common examples:\n'
            + '  Delivery cost:      { key: "DELIVERY_COST", value: 200 }\n'
            + '  Min order amount:   { key: "MIN_DELIVERY_AMOUNT", value: 500 }\n'
            + '  Free delivery from: { key: "FREE_DELIVERY_FROM", value: 1500 }\n'
            + '  Work hours:         { key: "WORK_TIME", value: [{ dayOfWeek: ["monday",...], start: "10:00", stop: "22:00", break: "00:00-00:00" }] }\n'
            + '  Currency symbol:    { key: "CURRENCY_SIGN", value: "₽" }',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                key:   { type: 'string', description: 'Setting key.', example: 'DELIVERY_COST' },
                value: { description: 'New value. Type must match the setting type (number/string/boolean/json).', example: 200 },
            },
            required: ['key', 'value'],
        },
        handler: async ({ key, value }: { key: string; value: any }) => {
            const normalized = key.toUpperCase().replace(/ /g, '_');
            const s = await Settings.findOne({ key: normalized });
            if (!s) throw new Error(`Setting "${key}" not found`);
            if (s.readOnly) throw new Error(`Setting "${key}" is read-only`);
            await Settings.set(normalized as any, { key: normalized, value } as any);
            const updated = await Settings.findOne({ key: normalized });
            if (!updated) return null;
            return {
                ...updated,
                value: maskSettingValue(updated, updated.value),
                defaultValue: maskSettingValue(updated, updated.defaultValue),
                ...(updated.restartRequired ? { note: 'Restart the application for this change to take effect.' } : {}),
            };
        },
    });
}
