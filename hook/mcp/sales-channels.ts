import { SalesChannelRegistry } from '../../libs/SalesChannelRegistry';

declare const mcp: any;

const VALID_STATUS = ['draft', 'needs_setup', 'ready', 'disabled', 'error'];

function stringArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
}

function slugify(value: string): string {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}

/** Map a SalesChannel record into a diagnostics-friendly shape (adds the registry's typeTitle/category). */
function mapChannel(channel: any) {
    const typeDef = SalesChannelRegistry.getType(channel?.type);
    return {
        id: channel?.id,
        key: channel?.key || '',
        title: channel?.title || channel?.key || '',
        type: channel?.type || 'custom',
        typeTitle: typeDef?.title || channel?.type || 'custom',
        category: typeDef?.category || 'custom',
        providerModule: channel?.providerModule || null,
        enabled: channel?.enabled === true,
        status: channel?.status || 'draft',
        countries: stringArray(channel?.countries),
        concepts: stringArray(channel?.concepts),
        platforms: stringArray(channel?.platforms),
        defaultConcept: channel?.defaultConcept || null,
        allowConceptSwitch: channel?.allowConceptSwitch !== false,
        url: channel?.url || null,
        sortOrder: Number(channel?.sortOrder) || 0,
        createdAt: channel?.createdAt ?? null,
        updatedAt: channel?.updatedAt ?? null,
    };
}

/**
 * MCP tools for SalesChannel (sales channels / order sources management).
 *
 * SalesChannel records are configured backend clients (website, bot, kiosk, …) that can
 * create orders. `platforms` lists the runtime device/platform labels (e.g. "web",
 * "pwa-android", "pwa-ios", "app-ios") that report orders through a channel — set manually
 * by the operator, never auto-filled. See models/SalesChannel.ts for the full model doc.
 */
export function registerSalesChannelsTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'sales-channel-list',
        description: 'Lists configured sales channels (order sources). Supports filtering by enabled, type and concept.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean', description: 'Filter by enabled flag.', example: true },
                type: { type: 'string', description: 'Filter by channel type slug.', example: 'web-storefront' },
                concept: { type: 'string', description: 'Filter to channels bound to this concept (or unbound = all concepts).', example: 'origin' },
            },
        },
        handler: async ({ enabled, type, concept }: { enabled?: boolean; type?: string; concept?: string }) => {
            const channels = await SalesChannel.find({}).sort('sortOrder ASC');
            return channels
                .map((c: any) => mapChannel(c))
                .filter((c: any) => {
                    if (enabled !== undefined && c.enabled !== enabled) return false;
                    if (type && c.type !== type) return false;
                    if (concept && c.concepts.length > 0 && !c.concepts.includes(concept)) return false;
                    return true;
                });
        },
    });

    mcp.registerTool({
        name: 'sales-channel-get',
        description: 'Returns a single sales channel by id or key.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'SalesChannel ID.', example: 'abc123' },
                key: { type: 'string', description: 'SalesChannel key.', example: 'web-main' },
            },
        },
        handler: async ({ id, key }: { id?: string; key?: string }) => {
            if (!id && !key) throw new Error('id or key is required');
            const channel = await SalesChannel.findOne(id ? { id } : { key });
            return channel ? mapChannel(channel) : null;
        },
    });

    mcp.registerTool({
        name: 'sales-channel-types',
        description: 'Lists the registered channel TYPES (web-storefront, telegram-bot, …) available to assign to a channel — not configured instances.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            return SalesChannelRegistry.listTypes();
        },
    });

    mcp.registerTool({
        name: 'sales-channel-resolve',
        description:
            'Diagnostic: resolves an order-source string (Order.orderedOnPlatform value) the way order creation does — '
            + 'matches an ENABLED channel by `key` first, then by membership in any channel\'s `platforms` list. '
            + 'Returns null when nothing matches (the value would still be accepted, just unattributed).',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                value: { type: 'string', description: 'Order source value to resolve.', example: 'pwa-android' },
            },
            required: ['value'],
        },
        handler: async ({ value }: { value: string }) => {
            const channel = await SalesChannel.resolve(value);
            return channel ? mapChannel(channel) : null;
        },
    });

    mcp.registerTool({
        name: 'sales-channel-upsert',
        description:
            'Creates or updates a sales channel. Pass id to update an existing one. `key` is slugified and must be '
            + 'unique; if omitted it is derived from title (create) or kept (update). `platforms` is the set of '
            + 'runtime orderedOnPlatform values that should resolve to this channel — set it explicitly, it is '
            + 'never filled automatically.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'SalesChannel ID — pass to update.', example: 'abc123' },
                key: { type: 'string', description: 'Stable slug. Auto-derived from title if omitted on create.', example: 'web-main' },
                title: { type: 'string', description: 'Display name.', example: 'Main website' },
                type: { type: 'string', description: 'Type slug from sales-channel-types (falls back to "custom").', example: 'web-storefront' },
                providerModule: { type: 'string', description: 'appId of the module providing this type.', example: 'admin-frontend' },
                enabled: { type: 'boolean', description: 'Master switch — only enabled channels are valid order sources.', example: true },
                status: { type: 'string', description: `One of: ${VALID_STATUS.join(', ')}.`, example: 'ready' },
                countries: { type: 'array', items: { type: 'string' }, description: 'ISO 3166-1 alpha-2 codes.', example: ['RU'] },
                platforms: { type: 'array', items: { type: 'string' }, description: 'Runtime platform/device labels that report through this channel.', example: ['web', 'pwa-android', 'pwa-ios', 'app-ios'] },
                concepts: { type: 'array', items: { type: 'string' }, description: 'Concept allowlist. Empty = all concepts.', example: [] },
                defaultConcept: { type: 'string', description: 'Default concept this channel writes into orders.', example: 'origin' },
                allowConceptSwitch: { type: 'boolean', description: 'Whether the frontend/bot may expose a concept selector.', example: true },
                url: { type: 'string', description: 'Public URL / deep-link.', example: 'https://gfcafe.ru' },
                sortOrder: { type: 'number', description: 'Display order.', example: 0 },
            },
            required: ['title'],
        },
        handler: async (params: Record<string, any>) => {
            const id = params.id ? String(params.id).trim() : '';
            const title = String(params.title || '').trim();
            if (!title) throw new Error('title is required');

            const existing = id ? await SalesChannel.findOne({ id }) : null;
            if (id && !existing) throw new Error('Sales channel not found');

            let key = slugify(String(params.key || '').trim());
            if (!key) key = existing ? existing.key : slugify(title);
            if (!key) throw new Error('key could not be derived — pass title or key');

            const clash = await SalesChannel.findOne({ key });
            if (clash && clash.id !== existing?.id) throw new Error('A sales channel with this key already exists');

            let type = String(params.type || existing?.type || 'custom').trim();
            if (!SalesChannelRegistry.getType(type) && type !== 'legacy') type = 'custom';
            const typeDef = SalesChannelRegistry.getType(type);

            const enabled = params.enabled !== undefined ? Boolean(params.enabled) : (existing?.enabled ?? false);
            let status = String(params.status || '').trim();
            if (!VALID_STATUS.includes(status)) {
                status = enabled ? 'ready' : (existing?.status && existing.status !== 'ready' ? existing.status : 'draft');
            }

            const concepts = params.concepts !== undefined ? stringArray(params.concepts) : stringArray(existing?.concepts);
            const defaultConceptRaw = params.defaultConcept !== undefined ? String(params.defaultConcept || '').trim() : (existing?.defaultConcept || '');
            const defaultConcept = defaultConceptRaw && (concepts.length === 0 || concepts.includes(defaultConceptRaw)) ? defaultConceptRaw : null;

            const values: any = {
                key,
                title,
                type,
                providerModule: params.providerModule !== undefined ? String(params.providerModule).trim() || null : (existing?.providerModule ?? typeDef?.providerModule ?? null),
                enabled,
                status,
                countries: params.countries !== undefined ? stringArray(params.countries) : stringArray(existing?.countries),
                platforms: params.platforms !== undefined ? stringArray(params.platforms) : stringArray(existing?.platforms),
                concepts,
                defaultConcept,
                allowConceptSwitch: params.allowConceptSwitch !== undefined ? Boolean(params.allowConceptSwitch) : (existing?.allowConceptSwitch ?? true),
                url: params.url !== undefined ? (String(params.url).trim() || null) : (existing?.url ?? null),
                sortOrder: params.sortOrder !== undefined ? Number(params.sortOrder) || 0 : (existing?.sortOrder ?? 0),
            };

            const saved = existing
                ? (await SalesChannel.update({ id: existing.id }, values).fetch())[0]
                : await SalesChannel.create(values).fetch();
            return mapChannel(saved);
        },
    });

    mcp.registerTool({
        name: 'sales-channel-delete',
        description: 'Deletes a configured sales channel. Existing orders keep their orderedOnPlatform string for reports — this is not destructive to order history.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'SalesChannel ID.', example: 'abc123' },
            },
            required: ['id'],
        },
        handler: async ({ id }: { id: string }) => {
            const existing = await SalesChannel.findOne({ id });
            if (!existing) throw new Error('Sales channel not found');
            await SalesChannel.destroy({ id }).fetch();
            return { success: true, id };
        },
    });
}
