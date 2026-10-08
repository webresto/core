import slugifyLib from 'slugify';
import { SalesChannelRegistry } from '../../lib/SalesChannelRegistry';
import {
    checkCanCreate,
    checkCanDelete,
    checkCanEnable,
    checkPlatforms,
    describeChannelProvider,
    getInstalledProviderAppIds,
    refreshStatuses,
    refusalText,
    SalesChannelRefusal,
} from '../../lib/SalesChannelProviders';

declare const mcp: any;

/** Same refusal the admin API answers with 409, as an MCP error. */
function refuse(refusal: SalesChannelRefusal): never {
    const extra = Object.entries(refusal.extra || {})
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([name, value]) => `${name}: ${value}`);
    throw new Error([refusalText(refusal), ...extra].join('; '));
}

function stringArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim());
}

/** Same transliterating slug as the admin page uses, so both produce the same channel key. */
function slugify(value: string): string {
    return slugifyLib(String(value || ''), { lower: true, strict: true, locale: 'en' })
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}

/**
 * Map a SalesChannel record into a diagnostics-friendly shape (adds the registry's
 * typeTitle/category and the same provider fields as the admin API — see
 * lib/SalesChannelProviders.ts describeChannelProvider).
 */
function mapChannel(channel: any, installed: Set<string> | null, computed?: any) {
    const typeDef = SalesChannelRegistry.getType(channel?.type);
    const provider = describeChannelProvider(channel, installed, computed);
    return {
        id: channel?.id,
        key: channel?.key || '',
        title: channel?.title || channel?.key || '',
        type: channel?.type || 'custom',
        typeTitle: typeDef?.title || channel?.type || 'custom',
        category: typeDef?.category || 'custom',
        providerModule: channel?.providerModule || null,
        managedBy: provider.managedBy,
        providerInstalled: provider.providerInstalled,
        providerAlive: provider.providerAlive,
        marketplaceAppId: provider.marketplaceAppId,
        settingsUrl: provider.settingsUrl,
        enabled: channel?.enabled === true,
        status: provider.status,
        statusMessage: provider.statusMessage,
        active: provider.active,
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

            const requestedType = String(params.type || '').trim();
            if (existing && requestedType && requestedType !== existing.type) throw new Error('Channel type cannot be changed');
            const type = existing ? existing.type : requestedType;
            if (!existing) {
                const refusal = await checkCanCreate(type);
                if (refusal) refuse(refusal);
            }
            const typeDef = SalesChannelRegistry.getType(type);

            const platforms = params.platforms !== undefined ? stringArray(params.platforms) : stringArray(existing?.platforms);
            const platformRefusal = await checkPlatforms(platforms, existing);
            if (platformRefusal) refuse(platformRefusal);

            const installed = await getInstalledProviderAppIds();
            const enabled = existing ? (params.enabled !== undefined ? Boolean(params.enabled) : existing.enabled === true) : false;
            let computed = null;
            if (existing && enabled && existing.enabled !== true) {
                const check = await checkCanEnable(existing, installed);
                if (check.refusal) refuse(check.refusal);
                computed = check.computed;
            }

            const concepts = params.concepts !== undefined ? stringArray(params.concepts) : stringArray(existing?.concepts);
            const defaultConceptRaw = params.defaultConcept !== undefined ? String(params.defaultConcept || '').trim() : (existing?.defaultConcept || '');
            const defaultConcept = defaultConceptRaw && (concepts.length === 0 || concepts.includes(defaultConceptRaw)) ? defaultConceptRaw : null;

            const values: any = {
                key,
                title,
                enabled,
                countries: params.countries !== undefined ? stringArray(params.countries) : stringArray(existing?.countries),
                platforms,
                concepts,
                defaultConcept,
                allowConceptSwitch: params.allowConceptSwitch !== undefined ? Boolean(params.allowConceptSwitch) : (existing?.allowConceptSwitch ?? true),
                url: params.url !== undefined ? (String(params.url).trim() || null) : (existing?.url ?? null),
                sortOrder: params.sortOrder !== undefined ? Number(params.sortOrder) || 0 : (existing?.sortOrder ?? 0),
            };

            let saved: any;
            if (existing) {
                saved = (await SalesChannel.update({ id: existing.id }, values).fetch())[0];
            } else {
                saved = await SalesChannel.create({
                    ...values,
                    type,
                    providerModule: typeDef?.providerModule ?? null,
                    managedBy: 'operator',
                    status: 'needs_setup',
                }).fetch();
                computed = await SalesChannel.channelStatus(saved);
            }
            return mapChannel(saved, installed, computed);
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
