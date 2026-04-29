declare const mcp: any;

export function registerDishesTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'dish-list',
        description: 'Returns a list of dishes. By default excludes soft-deleted. Supports filtering by parentGroup, concept, enable status.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                parentGroup:    { type: 'string',  description: 'Filter by parent group ID.', example: 'abc123' },
                concept:        { type: 'string',  description: 'Filter by concept name.', example: 'origin' },
                enable:         { type: 'boolean', description: 'Filter by enable flag.', example: true },
                includeDeleted: { type: 'boolean', description: 'Include soft-deleted dishes.', example: false },
                limit:          { type: 'integer', description: 'Max results.', example: 50 },
                skip:           { type: 'integer', description: 'Offset for pagination.', example: 0 },
            },
        },
        handler: async ({ parentGroup, concept, enable, includeDeleted, limit = 50, skip = 0 }: {
            parentGroup?: string; concept?: string; enable?: boolean;
            includeDeleted?: boolean; limit?: number; skip?: number;
        }) => {
            const criteria: any = {};
            if (!includeDeleted)     criteria.isDeleted = false;
            if (parentGroup !== undefined) criteria.parentGroup = parentGroup;
            if (enable  !== undefined) criteria.enable  = enable;
            if (concept !== undefined) criteria.concept = { contains: concept };
            return await Dish.find(criteria).limit(limit).skip(skip).sort('name ASC');
        },
    });

    mcp.registerTool({
        name: 'dish-get',
        description: 'Returns a single dish by id or slug. Includes all fields: price, description, SEO, worktime, modifiers.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:   { type: 'string', description: 'Dish ID.', example: 'abc123' },
                slug: { type: 'string', description: 'Dish slug.', example: 'margarita-pizza' },
            },
        },
        handler: async ({ id, slug }: { id?: string; slug?: string }) => {
            if (id)   return await Dish.findOne({ id }) ?? null;
            if (slug) return await Dish.findOne({ slug }) ?? null;
            throw new Error('Provide id or slug');
        },
    });

    mcp.registerTool({
        name: 'dish-create',
        description:
            'Creates a new dish. Slug is auto-generated from name.\n\n'
            + 'Note: dishes created via MCP are not linked to any RMS — rmsId will be empty.\n'
            + 'RMS sync will not overwrite enable/visible flags set manually.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                name:           { type: 'string',  description: 'Dish name.', example: 'Margarita pizza' },
                description:    { type: 'string',  description: 'Description.', example: 'Classic pizza with tomato sauce and mozzarella.' },
                ingredients:    { type: 'string',  description: 'Ingredients list.', example: 'Dough, tomato sauce, mozzarella' },
                price:          { type: 'number',  description: 'Price.', example: 450 },
                weight:         { type: 'number',  description: 'Weight in grams.', example: 350 },
                code:           { type: 'string',  description: 'Article number.', example: 'PIZ-001' },
                parentGroup:    { type: 'string',  description: 'Parent group ID.', example: 'group-abc123' },
                concept:        { type: 'array',   description: 'Concept names array.', example: ['origin'] },
                enable:         { type: 'boolean', description: 'Enable for ordering.', example: true },
                visible:        { type: 'boolean', description: 'Visible in menu.', example: true },
                alcohol:        { type: 'boolean', description: 'Contains alcohol.', example: false },
                caloriesAmount: { type: 'number',  description: 'Calories.', example: 800 },
                seoTitle:       { type: 'string',  description: 'SEO title.', example: 'Buy Margarita pizza' },
                seoDescription: { type: 'string',  description: 'SEO description.', example: 'Order Margarita pizza with delivery.' },
                seoKeywords:    { type: 'string',  description: 'SEO keywords.', example: 'pizza, margarita, delivery' },
            },
            required: ['name', 'price'],
        },
        handler: async (params: Record<string, unknown>) => {
            return await Dish.create(params).fetch();
        },
    });

    mcp.registerTool({
        name: 'dish-update',
        description:
            'Updates a dish. Pass id and only the fields to change.\n\n'
            + 'To move to another category: { id, parentGroup: "newGroupId" }\n'
            + 'To hide from menu:           { id, visible: false }\n'
            + 'To disable ordering:         { id, enable: false }',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:             { type: 'string',  description: 'Dish ID.', example: 'abc123' },
                name:           { type: 'string',  description: 'New name.', example: 'Updated pizza' },
                description:    { type: 'string',  description: 'New description.', example: 'Updated description.' },
                ingredients:    { type: 'string',  description: 'New ingredients.', example: 'Dough, sauce, cheese' },
                price:          { type: 'number',  description: 'New price.', example: 500 },
                weight:         { type: 'number',  description: 'New weight.', example: 400 },
                parentGroup:    { type: 'string',  description: 'New parent group ID — moves dish to another category.', example: 'group-xyz' },
                enable:         { type: 'boolean', description: 'Enable/disable for ordering.', example: false },
                visible:        { type: 'boolean', description: 'Show/hide in menu.', example: true },
                worktime:       { type: 'object',  description: 'Availability schedule (WorkTime format).', example: {} },
                seoTitle:       { type: 'string',  description: 'New SEO title.', example: 'Buy pizza' },
                seoDescription: { type: 'string',  description: 'New SEO description.', example: 'Order pizza online.' },
                seoKeywords:    { type: 'string',  description: 'New SEO keywords.', example: 'pizza, delivery' },
            },
            required: ['id'],
        },
        handler: async ({ id, ...rest }: Record<string, unknown>) => {
            const updated = await Dish.updateOne({ id: id as string }).set(rest);
            if (!updated) throw new Error('Dish not found');
            return updated;
        },
    });
}
