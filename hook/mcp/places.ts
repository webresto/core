declare const mcp: any;

export function registerPlacesTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'place-list',
        group: 'places',
        description: 'Returns all restaurant/pickup locations with address, phone, working hours and type flags (isPickupPoint, isCookingPoint, isSalePoint).',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            return await Place.find().sort('order ASC');
        },
    });

    mcp.registerTool({
        name: 'place-get',
        group: 'places',
        description: 'Returns a single place by id. Includes full worktime and customData.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Place ID.', example: 'abc123' },
            },
            required: ['id'],
        },
        handler: async ({ id }: { id: string }) => {
            return await Place.findOne({ id }) ?? null;
        },
    });

    mcp.registerTool({
        name: 'place-create',
        group: 'places',
        description: 'Creates a new restaurant/pickup location.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                title:          { type: 'string',  description: 'Location name.', example: 'Main restaurant' },
                address:        { type: 'string',  description: 'Street address.', example: 'Lenina st. 1' },
                phone:          { type: 'string',  description: 'Contact phone.', example: '+79001234567' },
                order:          { type: 'number',  description: 'Sort order.', example: 1 },
                enable:         { type: 'boolean', description: 'Whether the location is active.', example: true },
                isPickupPoint:  { type: 'boolean', description: 'Can be selected as pickup point.', example: true },
                isCookingPoint: { type: 'boolean', description: 'Has a kitchen.', example: true },
                isSalePoint:    { type: 'boolean', description: 'Is a point of sale.', example: true },
                worktime:       { type: 'object',  description: 'Operating hours (WorkTime format).', example: {} },
                customData:     { type: 'object',  description: 'Arbitrary JSON for frontend.', example: {} },
            },
            required: ['title', 'address', 'enable'],
        },
        handler: async (params: Record<string, unknown>) => {
            return await Place.create(params).fetch();
        },
    });

    mcp.registerTool({
        name: 'place-update',
        group: 'places',
        description: 'Updates a place. Pass id and only the fields to change.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:             { type: 'string',  description: 'Place ID.', example: 'abc123' },
                title:          { type: 'string',  description: 'New name.', example: 'Updated restaurant' },
                address:        { type: 'string',  description: 'New address.', example: 'Pushkina st. 5' },
                phone:          { type: 'string',  description: 'New phone.', example: '+79007654321' },
                order:          { type: 'number',  description: 'Sort order.', example: 2 },
                enable:         { type: 'boolean', description: 'Enable/disable.', example: false },
                isPickupPoint:  { type: 'boolean', example: true },
                isCookingPoint: { type: 'boolean', example: false },
                isSalePoint:    { type: 'boolean', example: true },
                worktime:       { type: 'object',  description: 'New worktime schedule.', example: {} },
                customData:     { type: 'object',  description: 'New customData.', example: {} },
            },
            required: ['id'],
        },
        handler: async ({ id, ...rest }: Record<string, unknown>) => {
            const updated = await Place.updateOne({ id: id as string }).set(rest);
            if (!updated) throw new Error('Place not found');
            return updated;
        },
    });
}
