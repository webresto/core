declare const mcp: any;

export function registerSettingsTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'settings-list',
        description: 'Returns all settings with key, current value, type, description and jsonSchema. Read this before calling settings-set to understand what can be changed and what format is expected.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                module: { type: 'string', description: 'Filter by module name.', example: 'core' },
            },
        },
        handler: async ({ module }: { module?: string }) => {
            const criteria: any = module ? { module } : {};
            const settings = await Settings.find(criteria).sort('key ASC');
            return settings.map((s: any) => ({
                key: s.key,
                value: s.value ?? s.defaultValue ?? null,
                defaultValue: s.defaultValue ?? null,
                type: s.type,
                name: s.name,
                description: s.description ?? null,
                readOnly: s.readOnly ?? false,
                module: s.module ?? null,
            }));
        },
    });

    mcp.registerTool({
        name: 'settings-get',
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
            return s;
        },
    });

    mcp.registerTool({
        name: 'settings-set',
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
            await Settings.set(normalized, { key: normalized, value });
            return await Settings.findOne({ key: normalized });
        },
    });
}
