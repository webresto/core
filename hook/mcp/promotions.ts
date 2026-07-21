import hashCode, { generateUUID } from '../../libs/hashCode';
import { boundedPage, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from './pagination';

declare const mcp: any;

/**
 * MCP tools for Promotion + PromotionCode (promo / promocode management).
 *
 * Model relations: Promotion <-> PromotionCode is many-to-many.
 * A Promotion holds the discount/gift config (configDiscount, JSON); a
 * PromotionCode is the typed-in code that force-applies its linked promotions
 * (bypassing condition() — see docs/promotions.md).
 *
 * Promotions created here get createdByUser:true so the core registers them as
 * ConfiguredPromotion handlers on afterCreate/afterUpdate.
 *
 * NOTE: Promotion.beforeCreate overrides `enable` based on PROMOTION_ENABLE_BY_DEFAULT
 * / NODE_ENV (true on non-production). To reliably (un)register a promotion use
 * promotion-update { enable } afterwards.
 */
export function registerPromotionsTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    // ----------------------------- Promotion ------------------------------ //

    mcp.registerTool({
        name: 'promotion-list',
        group: 'promotions',
        description: 'Returns a list of promotions. By default excludes soft-deleted. Supports filtering by concept, enable and createdByUser.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                concept:        { type: 'string',  description: 'Filter by concept name.', example: 'origin' },
                enable:         { type: 'boolean', description: 'Filter by enable flag.', example: true },
                createdByUser:  { type: 'boolean', description: 'Filter by createdByUser flag (false = registered from code).', example: true },
                includeDeleted: { type: 'boolean', description: 'Include soft-deleted promotions.', example: false },
                limit:          { type: 'integer', description: `Max results (default ${DEFAULT_LIST_LIMIT}, hard cap ${MAX_LIST_LIMIT}).`, example: 50 },
                skip:           { type: 'integer', description: 'Offset for pagination.', example: 0 },
            },
        },
        handler: async (params: {
            concept?: string; enable?: boolean; createdByUser?: boolean;
            includeDeleted?: boolean; limit?: number; skip?: number;
        }) => {
            const { concept, enable, createdByUser, includeDeleted } = params;
            const { limit, skip } = boundedPage(params.limit, params.skip);
            const criteria: any = {};
            if (!includeDeleted)            criteria.isDeleted = false;
            if (enable        !== undefined) criteria.enable        = enable;
            if (createdByUser !== undefined) criteria.createdByUser = createdByUser;
            if (concept       !== undefined) criteria.concept = { contains: concept };
            return await Promotion.find(criteria).limit(limit).skip(skip).sort('sortOrder ASC');
        },
    });

    mcp.registerTool({
        name: 'promotion-get',
        group: 'promotions',
        description: 'Returns a single promotion by id, including linked promocodes.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Promotion ID.', example: 'abc123' },
            },
            required: ['id'],
        },
        handler: async ({ id }: { id: string }) => {
            return await Promotion.findOne({ id }).populate('promotionCode') ?? null;
        },
    });

    mcp.registerTool({
        name: 'promotion-create',
        group: 'promotions',
        description:
            'Creates a promotion (createdByUser:true → registered as a ConfiguredPromotion).\n\n'
            + 'configDiscount holds the discount and/or gift config (stored as JSON):\n'
            + '  - discount:  { discountType: "flat"|"percentage", discountAmount, dishes:[], groups:[] }\n'
            + '  - gift:      { gift: { minBasketTotal, dishes:[{ dishId, amount }] }, dishes:[], groups:[] }\n'
            + 'A gift-only promo may omit discountType. For a "promocode only" gift set isPublic:false, '
            + 'isJoint:true and keep dishes:[]/groups:[] so condition() never applies it on its own — '
            + 'it is then applied solely via a linked PromotionCode.\n\n'
            + 'NOTE: enable is forced by Promotion.beforeCreate (true on non-production). '
            + 'Use promotion-update { enable } to control it reliably.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                name:           { type: 'string',  description: 'Promotion name.', example: 'EXAMPLE_CODE_123' },
                description:    { type: 'string',  description: 'Description (defaults to name).', example: 'Подарочные магниты по промокоду' },
                configDiscount: { type: 'object',  description: 'Discount/gift config (JSON).', example: { gift: { minBasketTotal: 1449, dishes: [{ dishId: 'magnet-id', amount: 2 }] }, dishes: [], groups: [] } },
                concept:        { type: 'array',   description: 'Concept names array.', example: ['origin'] },
                isJoint:        { type: 'boolean', description: 'Stackable with other promotions.', example: true },
                isPublic:       { type: 'boolean', description: 'Visible to customer (display only).', example: false },
                badge:          { type: 'string',  description: 'Handler badge.', example: 'configured-promotion' },
                sortOrder:      { type: 'number',  description: 'Apply order.', example: 0 },
                enable:         { type: 'boolean', description: 'Enable (may be overridden on create — see note).', example: true },
                externalId:     { type: 'string',  description: 'External id (unique; auto-generated if omitted).', example: 'magnit-2026' },
                worktime:       { type: 'object',  description: 'Availability schedule (WorkTime format).', example: {} },
            },
            required: ['name', 'configDiscount'],
        },
        handler: async (params: Record<string, any>) => {
            const configDiscount = params.configDiscount ?? {};
            const values: any = {
                name:           params.name,
                description:    params.description ?? params.name,
                configDiscount,
                concept:        params.concept ?? ['origin'],
                isJoint:        params.isJoint  ?? true,
                isPublic:       params.isPublic ?? false,
                badge:          params.badge ?? 'configured-promotion',
                createdByUser:  true,
                sortOrder:      params.sortOrder ?? 0,
                externalId:     params.externalId ?? generateUUID(),
                hash:           hashCode(JSON.stringify(configDiscount)),
                isDeleted:      false,
            };
            if (params.enable   !== undefined) values.enable   = params.enable;
            if (params.worktime !== undefined) values.worktime = params.worktime;
            return await Promotion.create(values).fetch();
        },
    });

    mcp.registerTool({
        name: 'promotion-update',
        group: 'promotions',
        description:
            'Updates a promotion. Pass id and only the fields to change.\n\n'
            + 'To enable/register:  { id, enable: true }\n'
            + 'To disable/unregister:{ id, enable: false }\n'
            + 'To change the gift/discount: { id, configDiscount: { ... } }',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:             { type: 'string',  description: 'Promotion ID.', example: 'abc123' },
                name:           { type: 'string',  description: 'New name.', example: 'EXAMPLE_CODE_123' },
                description:    { type: 'string',  description: 'New description.', example: 'Updated description.' },
                configDiscount: { type: 'object',  description: 'New discount/gift config (JSON).', example: { gift: { minBasketTotal: 1449, dishes: [{ dishId: 'magnet-id', amount: 2 }] }, dishes: [], groups: [] } },
                concept:        { type: 'array',   description: 'New concept array.', example: ['origin'] },
                isJoint:        { type: 'boolean', description: 'Stackable with other promotions.', example: true },
                isPublic:       { type: 'boolean', description: 'Visible to customer.', example: false },
                enable:         { type: 'boolean', description: 'Enable (register) / disable (unregister).', example: true },
                sortOrder:      { type: 'number',  description: 'Apply order.', example: 0 },
                worktime:       { type: 'object',  description: 'Availability schedule.', example: {} },
            },
            required: ['id'],
        },
        handler: async ({ id, ...rest }: Record<string, any>) => {
            if (rest.configDiscount !== undefined) {
                rest.hash = hashCode(JSON.stringify(rest.configDiscount));
            }
            const updated = await Promotion.updateOne({ id: id as string }).set(rest);
            if (!updated) throw new Error('Promotion not found');
            return updated;
        },
    });

    mcp.registerTool({
        name: 'promotion-delete',
        group: 'promotions',
        description: 'Permanently deletes a promotion (and unlinks it from promocodes). To merely disable it use promotion-update with { enable: false }.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Promotion ID.', example: 'abc123' },
            },
            required: ['id'],
        },
        handler: async ({ id }: { id: string }) => {
            const deleted = await Promotion.destroyOne({ id } as any);
            if (!deleted) throw new Error('Promotion not found');
            return { success: true, id };
        },
    });

    // --------------------------- PromotionCode ----------------------------- //

    mcp.registerTool({
        name: 'promocode-list',
        group: 'promotions',
        description: 'Returns a list of promocodes, including linked promotions. Supports filtering by code and enable state.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                code:  { type: 'string',  description: 'Filter by exact code (case-sensitive).', example: 'EXAMPLE_CODE_123' },
                enable:{ type: 'boolean', description: 'Filter by enabled state.', example: true },
                limit: { type: 'integer', description: `Max results (default ${DEFAULT_LIST_LIMIT}, hard cap ${MAX_LIST_LIMIT}).`, example: 50 },
                skip:  { type: 'integer', description: 'Offset for pagination.', example: 0 },
            },
        },
        handler: async (params: { code?: string; enable?: boolean; limit?: number; skip?: number }) => {
            const { code, enable } = params;
            const { limit, skip } = boundedPage(params.limit, params.skip);
            const criteria: any = {};
            if (code !== undefined) criteria.code = code;
            if (enable !== undefined) criteria.enable = enable;
            return await PromotionCode.find(criteria).limit(limit).skip(skip).populate('promotion');
        },
    });

    mcp.registerTool({
        name: 'promocode-get',
        group: 'promotions',
        description: 'Returns a single promocode by id or code (case-sensitive), including linked promotions.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:   { type: 'string', description: 'Promocode ID.', example: 'abc123' },
                code: { type: 'string', description: 'Promocode string (exact, case-sensitive).', example: 'EXAMPLE_CODE_123' },
            },
        },
        handler: async ({ id, code }: { id?: string; code?: string }) => {
            if (id)   return await PromotionCode.findOne({ id }).populate('promotion') ?? null;
            if (code) return await PromotionCode.findOne({ code }).populate('promotion') ?? null;
            throw new Error('Provide id or code');
        },
    });

    mcp.registerTool({
        name: 'promocode-create',
        group: 'promotions',
        description:
            'Creates a promocode and (optionally) links it to promotions.\n\n'
            + 'The code is matched on checkout exactly and case-sensitively, so enter it precisely '
            + '(e.g. "EXAMPLE_CODE_123"). Pass promotion: [promotionId, ...] to bind the promotions it activates.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                code:        { type: 'string', description: 'The code customers type. Exact, case-sensitive.', example: 'EXAMPLE_CODE_123' },
                description: { type: 'string', description: 'Description (defaults to code).', example: 'Подарочные магниты' },
                type:        { type: 'string', description: 'Code type.', example: 'static' },
                promotion:   { type: 'array',  description: 'Promotion IDs to link (activated by this code).', example: ['promo-id'] },
                externalId:  { type: 'string', description: 'External id.', example: 'magnit-code' },
                startDate:   { type: 'string', description: 'Start date.', example: '2026-06-17' },
                stopDate:    { type: 'string', description: 'Stop date.', example: '2026-12-31' },
                enable:      { type: 'boolean', description: 'Whether customers can apply the code.', example: true },
            },
            required: ['code'],
        },
        handler: async (params: Record<string, any>) => {
            const promotionIds: string[] = Array.isArray(params.promotion) ? params.promotion : [];
            const created = await PromotionCode.create({
                code:        params.code,
                description: params.description ?? params.code,
                type:        params.type ?? 'static',
                ...(params.externalId !== undefined && { externalId: params.externalId }),
                ...(params.startDate  !== undefined && { startDate: params.startDate }),
                ...(params.stopDate   !== undefined && { stopDate: params.stopDate }),
                ...(params.enable     !== undefined && { enable: params.enable }),
            }).fetch();
            if (promotionIds.length) {
                await PromotionCode.addToCollection(created.id, 'promotion').members(promotionIds);
            }
            return await PromotionCode.findOne({ id: created.id }).populate('promotion');
        },
    });

    mcp.registerTool({
        name: 'promocode-update',
        group: 'promotions',
        description:
            'Updates a promocode. Pass id and the fields to change.\n\n'
            + 'To re-bind promotions pass promotion: [promotionId, ...] — it REPLACES the current set '
            + '(pass [] to unlink all). Set enable:false to turn the code off.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:          { type: 'string', description: 'Promocode ID.', example: 'abc123' },
                code:        { type: 'string', description: 'New code (exact, case-sensitive).', example: 'EXAMPLE_CODE_123' },
                description: { type: 'string', description: 'New description.', example: 'Updated.' },
                type:        { type: 'string', description: 'Code type.', example: 'static' },
                promotion:   { type: 'array',  description: 'Promotion IDs — replaces the linked set.', example: ['promo-id'] },
                startDate:   { type: 'string', description: 'Start date.', example: '2026-06-17' },
                stopDate:    { type: 'string', description: 'Stop date.', example: '2026-12-31' },
                enable:      { type: 'boolean', description: 'Enable/disable this promo code.', example: true },
            },
            required: ['id'],
        },
        handler: async ({ id, promotion, ...rest }: Record<string, any>) => {
            if (Object.keys(rest).length) {
                const updated = await PromotionCode.updateOne({ id: id as string }).set(rest);
                if (!updated) throw new Error('Promocode not found');
            }
            if (Array.isArray(promotion)) {
                await PromotionCode.replaceCollection(id, 'promotion').members(promotion);
            }
            return await PromotionCode.findOne({ id }).populate('promotion');
        },
    });

    mcp.registerTool({
        name: 'promocode-delete',
        group: 'promotions',
        description: 'Permanently deletes a promocode (unlinks it from promotions; the promotions themselves are kept).',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Promocode ID.', example: 'abc123' },
            },
            required: ['id'],
        },
        handler: async ({ id }: { id: string }) => {
            const deleted = await PromotionCode.destroyOne({ id } as any);
            if (!deleted) throw new Error('Promocode not found');
            return { success: true, id };
        },
    });
}
