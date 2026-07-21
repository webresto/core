import { boundedPage, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from './pagination';

declare const mcp: any;

export function registerGroupsTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'group-list',
        group: 'groups',
        description: 'Returns menu categories. By default excludes soft-deleted. Supports filtering by concept and enable status. Paginated: use skip+limit.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                concept:        { type: 'string',  description: 'Filter by concept name.', example: 'origin' },
                enable:         { type: 'boolean', description: 'Filter by enable flag.', example: true },
                includeDeleted: { type: 'boolean', description: 'Include soft-deleted groups.', example: false },
                limit:          { type: 'integer', description: `Max results (default ${DEFAULT_LIST_LIMIT}, hard cap ${MAX_LIST_LIMIT}).`, example: 50 },
                skip:           { type: 'integer', description: 'Offset for pagination.', example: 0 },
            },
        },
        handler: async (params: { concept?: string; enable?: boolean; includeDeleted?: boolean; limit?: number; skip?: number }) => {
            const { concept, enable, includeDeleted } = params;
            const { limit, skip } = boundedPage(params.limit, params.skip);
            const criteria: any = {};
            if (!includeDeleted)     criteria.isDeleted = false;
            if (enable  !== undefined) criteria.enable  = enable;
            if (concept !== undefined) criteria.concept = { contains: concept };
            return await Group.find(criteria).limit(limit).skip(skip).sort('sortOrder ASC');
        },
    });

    mcp.registerTool({
        name: 'group-get',
        group: 'groups',
        description: 'Returns a single menu category by id or slug. Includes all fields: SEO, worktime, parentGroup.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:   { type: 'string', description: 'Group ID.', example: 'abc123' },
                slug: { type: 'string', description: 'Group slug.', example: 'pizza' },
            },
        },
        handler: async ({ id, slug }: { id?: string; slug?: string }) => {
            if (id)   return await Group.findOne({ id }) ?? null;
            if (slug) return await Group.findOne({ slug }) ?? null;
            throw new Error('Provide id or slug');
        },
    });

    mcp.registerTool({
        name: 'group-create',
        group: 'groups',
        description: 'Creates a new menu category. Slug is auto-generated from name. Pass parentGroup to nest inside another category.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                name:           { type: 'string',  description: 'Category name.', example: 'Pizza' },
                description:    { type: 'string',  description: 'Description.', example: 'Our pizza selection' },
                sortOrder:      { type: 'number',  description: 'Display order.', example: 10 },
                enable:         { type: 'boolean', description: 'Enable in menu.', example: true },
                parentGroup:    { type: 'string',  description: 'Parent group ID for nested categories.', example: 'group-abc123' },
                concept:        { type: 'array',   description: 'Concept names array.', example: ['origin'] },
                seoTitle:       { type: 'string',  description: 'SEO title.', example: 'Order pizza' },
                seoDescription: { type: 'string',  description: 'SEO description.', example: 'Best pizza in town.' },
                seoKeywords:    { type: 'string',  description: 'SEO keywords.', example: 'pizza, order' },
            },
            required: ['name'],
        },
        handler: async (params: Record<string, unknown>) => {
            return await Group.create(params).fetch();
        },
    });

    mcp.registerTool({
        name: 'group-update',
        group: 'groups',
        description:
            'Updates a menu category. Pass id and only the fields to change.\n\n'
            + 'To move to another parent: { id, parentGroup: "newParentId" }\n'
            + 'To move to root level:     { id, parentGroup: null }\n'
            + 'To disable:                { id, enable: false }',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:             { type: 'string',  description: 'Group ID.', example: 'abc123' },
                name:           { type: 'string',  description: 'New name.', example: 'Updated category' },
                description:    { type: 'string',  description: 'New description.', example: 'Updated description.' },
                sortOrder:      { type: 'number',  description: 'New display order.', example: 5 },
                enable:         { type: 'boolean', description: 'Enable/disable.', example: false },
                parentGroup:    { type: 'string',  description: 'New parent group ID. Pass null to move to root.', example: 'group-xyz' },
                worktime:       { type: 'object',  description: 'Availability schedule.', example: {} },
                seoTitle:       { type: 'string',  description: 'New SEO title.', example: 'Updated SEO title' },
                seoDescription: { type: 'string',  description: 'New SEO description.', example: 'Updated SEO desc.' },
                seoKeywords:    { type: 'string',  description: 'New SEO keywords.', example: 'category, menu' },
            },
            required: ['id'],
        },
        handler: async ({ id, ...rest }: Record<string, unknown>) => {
            const updated = await Group.updateOne({ id: id as string }).set(rest);
            if (!updated) throw new Error('Group not found');
            return updated;
        },
    });
}
