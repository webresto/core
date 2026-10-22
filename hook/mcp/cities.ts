declare const mcp: any;

/**
 * Cities: what places, zones and address catalogs belong to, and what a
 * customer chooses on the storefront. A city is never deleted here — places,
 * zones and addresses point at it — it is switched off with isDeleted.
 */
const CITY_FIELDS = {
    name: { type: 'string', description: 'City name, as the storefront shows it.', example: 'Екатеринбург' },
    slug: { type: 'string', description: 'Latin slug for addresses of the storefront.', example: 'ekaterinburg' },
    url: { type: 'string', description: 'Backend of a franchise city, when it runs its own server. Empty - this server.', example: '' },
    externalId: { type: 'string', description: 'City id in an RMS.', example: '' },
    boundingBox: { type: 'object', description: 'Area the storefront\'s map and search keep to.', example: {} },
    customData: { type: 'object', description: 'Arbitrary JSON.', example: {} },
};

export function registerCitiesTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'city-list',
        group: 'cities',
        description: 'Returns the cities with the number of their places. Switched off (isDeleted) cities only when asked.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                includeDeleted: { type: 'boolean', description: 'Include cities with isDeleted=true.', example: false },
            },
        },
        handler: async ({ includeDeleted }: { includeDeleted?: boolean }) => {
            const criteria = includeDeleted ? {} : { isDeleted: { '!=': true } };
            const cities = await City.find(criteria).sort('name ASC');
            return await Promise.all(cities.map(async (city: any) => ({
                ...city,
                places: await Place.count({ city: city.id }),
            })));
        },
    });

    mcp.registerTool({
        name: 'city-create',
        group: 'cities',
        description: 'Creates a city. Then add its places (place-create with city), its zones and its address catalog (address-import).',
        mode: 'protected',
        schema: { type: 'object', properties: CITY_FIELDS, required: ['name'] },
        handler: async (params: Record<string, unknown>) => {
            const name = typeof params.name === 'string' ? params.name.trim() : '';
            if (!name) throw new Error('name is required');
            const twin = await City.findOne({ name, isDeleted: { '!=': true } });
            if (twin) throw new Error(`City "${name}" already exists: ${twin.id}`);
            return await City.create({ ...params, name }).fetch();
        },
    });

    mcp.registerTool({
        name: 'city-update',
        group: 'cities',
        description: 'Updates a city. Pass id and only the fields to change; isDeleted=true switches the city off, false brings it back.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'City ID.', example: 'abc123' },
                ...CITY_FIELDS,
                isDeleted: { type: 'boolean', description: 'Switch the city off (true) or back on (false).', example: false },
            },
            required: ['id'],
        },
        handler: async ({ id, ...fields }: Record<string, unknown>) => {
            const updated = await City.updateOne({ id: id as string }).set(fields);
            if (!updated) throw new Error('City not found');
            return updated;
        },
    });
}
