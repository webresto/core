import { SalesChannelRegistry } from '../../lib/SalesChannelRegistry';
import {
    checkCanDelete,
    checkCanEnable,
    getInstalledProviderAppIds,
    refreshStatuses,
    refusalText,
    SalesChannelRefusal,
} from '../../lib/SalesChannelProviders';
import { describeChannel } from '../../lib/sales-channels/view';
import { applyChannel } from '../../lib/sales-channels/apply';

declare const mcp: any;

/** Same refusal the admin API answers with 409, as an MCP error. */
function refuse(refusal: SalesChannelRefusal): never {
    const extra = Object.entries(refusal.extra || {})
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([name, value]) => `${name}: ${value}`);
    throw new Error([refusalText(refusal), ...extra].join('; '));
}

/**
 * A SalesChannel as a diagnostics-friendly record: the registry's typeTitle/category, the provider
 * fields and the words of the admin page, all from lib/sales-channels/view.ts — the one view the page,
 * these tools and the mobile API read, so a status cannot mean two things. `secretsRef` is never in it.
 */
function mapChannel(channel: any, installed: Set<string> | null, computed?: any) {
    const view = describeChannel(channel, { canManage: true, installed, computed });
    return {
        id: view.id,
        key: view.key,
        title: view.title,
        type: view.type,
        typeTitle: view.typeTitle,
        category: view.category,
        providerModule: view.providerModule,
        managedBy: view.managedBy,
        providerInstalled: view.providerInstalled,
        providerAlive: view.providerAlive,
        marketplaceAppId: view.marketplaceAppId,
        settingsUrl: view.settingsUrl,
        enabled: view.enabled,
        status: view.status,
        statusMessage: view.statusMessage,
        statusText: view.statusText,
        providerText: view.providerText,
        active: view.active,
        countries: view.countries,
        concepts: view.concepts,
        platforms: view.platforms,
        defaultConcept: view.defaultConcept,
        allowConceptSwitch: view.allowConceptSwitch,
        url: view.url,
        sortOrder: view.sortOrder,
        createdAt: view.createdAt,
        updatedAt: view.updatedAt,
    };
}

/**
 * MCP tools for SalesChannel (sales channels / order sources management).
 *
 * SalesChannel records are configured backend clients (website, bot, kiosk, …) that can
 * create orders. They come from provider modules (SalesChannel.alive); the tools enforce
 * the same rules as the admin API: create only for a type with a live provider, switch on
 * only when the provider reports ready, a platform belongs to one channel, provider
 * channels are not deleted while their module is installed. `status` is the provider's
 * readiness and cannot be set. See models/SalesChannel.ts for the full model doc.
 */
export function registerSalesChannelsTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'sales-channel-list',
        group: 'sales-channels',
        description: 'Lists configured sales channels (order sources) with provider state and fresh readiness. '
            + '`active` = enabled + ready + provider alive: only active channels take orders. Supports filtering by enabled, type and concept.',
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
            const [installed, statuses] = await Promise.all([getInstalledProviderAppIds(), refreshStatuses(channels)]);
            return channels
                .map((c: any) => mapChannel(c, installed, statuses[c.id]))
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
        group: 'sales-channels',
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
            if (!channel) return null;
            const [installed, computed] = await Promise.all([getInstalledProviderAppIds(), SalesChannel.channelStatus(channel)]);
            return mapChannel(channel, installed, computed);
        },
    });

    mcp.registerTool({
        name: 'sales-channel-types',
        group: 'sales-channels',
        description: 'Lists the registered channel TYPES (web-storefront, telegram-bot, …) — not configured instances. '
            + '`alive` = the provider module is running, only then a channel of the type can be created; '
            + '`comingSoon` types have no provider yet.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            return SalesChannelRegistry.listTypes().map((def) => ({ ...def, alive: Boolean(SalesChannel.getAdapter(def.type)) }));
        },
    });

    mcp.registerTool({
        name: 'sales-channel-resolve',
        group: 'sales-channels',
        description:
            'Diagnostic: resolves an order-source string (Order.orderedOnPlatform value) the way order creation does — '
            + 'matches an ACTIVE channel (enabled + ready + provider alive) by `key` first, then by membership in any channel\'s `platforms` list. '
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
            return channel ? mapChannel(channel, await getInstalledProviderAppIds()) : null;
        },
    });

    mcp.registerTool({
        name: 'sales-channel-upsert',
        group: 'sales-channels',
        description:
            'Creates or updates a sales channel. Pass id to update an existing one. `key` is slugified and must be '
            + 'unique; if omitted it is derived from title (create) or kept (update). Create only works for a type whose '
            + 'provider is alive (see sales-channel-types); a new channel starts disabled, the provider reports readiness. '
            + '`type` cannot be changed later. `enabled: true` is refused until the provider reports ready ("Finish setup first"). '
            + '`platforms` is the set of runtime orderedOnPlatform values that should resolve to this channel; a platform '
            + 'may belong to one channel only.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'SalesChannel ID — pass to update.', example: 'abc123' },
                key: { type: 'string', description: 'Stable slug. Auto-derived from title if omitted on create.', example: 'web-main' },
                title: { type: 'string', description: 'Display name.', example: 'Main website' },
                type: { type: 'string', description: 'Type slug from sales-channel-types. Required on create, fixed afterwards.', example: 'web-storefront' },
                enabled: { type: 'boolean', description: 'Operator switch. Ignored on create (channels start disabled); switching on needs a ready provider.', example: true },
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
            // The same write the admin page performs: lib/sales-channels/apply.ts owns the key, the
            // slug, the fixed type, which fields are taken and the provider rules.
            const outcome = await applyChannel(params);
            if (!outcome.ok) refuse(outcome.refusal);
            return mapChannel(outcome.saved, outcome.installed, outcome.computed);
        },
    });

    mcp.registerTool({
        name: 'sales-channel-delete',
        group: 'sales-channels',
        description: 'Deletes a configured sales channel. A provider\'s own channel cannot be deleted while its module is installed — disable it instead. '
            + 'Existing orders keep their orderedOnPlatform string for reports — this is not destructive to order history.',
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
            const refusal = checkCanDelete(existing, await getInstalledProviderAppIds());
            if (refusal) refuse(refusal);
            await SalesChannel.destroyChannel(existing);
            return { success: true, id };
        },
    });
}
