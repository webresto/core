import { getDishPlaceBalanceMode, getEffectiveBalance, UNLIMITED_BALANCE } from '../../lib/menu/dish-place-balance';

declare const mcp: any;

/**
 * Stock per place: a dish at a kitchen has the operator's balance, the RMS's
 * balance and a switch. No row means unlimited and on, and a row that limits
 * nothing is removed (`DishPlace.upsertForPlace`), so the list holds only what
 * actually limits something.
 *
 * `balance` is what the storefront and the basket go by: the two balances
 * combined by the configured mode, and 0 for a dish switched off. -1 is
 * unlimited.
 */
function idOf(value: unknown): string {
    return typeof value === 'string' ? value : (value as { id: string }).id;
}

export function registerStockTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'stock-list',
        group: 'stock',
        description:
            'Stock of the dishes at a place. By default only the dishes something limits there (a balance, a stop, a switch); '
            + 'all: true lists every dish of the menu with its effective balance (-1 = unlimited).',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                placeId: { type: 'string', description: 'Place (kitchen) ID.', example: 'abc123' },
                all: { type: 'boolean', description: 'Every dish of the menu, not only the limited ones.', example: false },
            },
            required: ['placeId'],
        },
        handler: async ({ placeId, all }: { placeId: string; all?: boolean }) => {
            const place = await Place.findOne({ id: placeId });
            if (!place) throw new Error('Place not found');

            const mode = await getDishPlaceBalanceMode();
            const rows = await DishPlace.find({ place: placeId });
            const byDish = new Map(rows.map((row: any) => [idOf(row.dish), row]));

            const dishIds = all ? undefined : [...byDish.keys()];
            const dishes = dishIds && !dishIds.length ? [] : await Dish.find(dishIds ? { id: dishIds } : { isDeleted: false });

            const items = dishes.map((dish: any) => {
                const row: any = byDish.get(dish.id);
                return {
                    dishId: dish.id,
                    name: dish.name,
                    localBalance: row?.localBalance ?? null,
                    rmsBalance: row?.rmsBalance ?? null,
                    enable: row ? row.enable !== false : true,
                    balance: row
                        ? getEffectiveBalance({ localBalance: row.localBalance, rmsBalance: row.rmsBalance, enable: row.enable, mode })
                        : UNLIMITED_BALANCE,
                };
            });

            return { placeId, title: place.title, mode, count: items.length, items };
        },
    });

    mcp.registerTool({
        name: 'stock-set',
        group: 'stock',
        description:
            'Sets the operator\'s stock of a dish at a place, or switches the dish off there. localBalance: a number, 0 = stop, '
            + '-1 or null = no limit of the operator. enable: false takes the dish off at this place whatever its balance. '
            + 'The RMS balance is not touched.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                placeId: { type: 'string', description: 'Place (kitchen) ID.', example: 'abc123' },
                dishId: { type: 'string', description: 'Dish ID.', example: 'def456' },
                localBalance: { type: ['number', 'null'], description: 'Operator balance; 0 - stop; -1 or null - no limit.', example: 10 },
                enable: { type: 'boolean', description: 'false - the dish is off at this place.', example: true },
            },
            required: ['placeId', 'dishId'],
        },
        handler: async ({ placeId, dishId, localBalance, enable }: Record<string, any>) => {
            if (localBalance === undefined && enable === undefined) throw new Error('Give localBalance or enable');
            if (localBalance !== undefined && localBalance !== null
                && (typeof localBalance !== 'number' || !Number.isFinite(localBalance) || localBalance < UNLIMITED_BALANCE)) {
                throw new Error('localBalance must be a number from -1 up, or null');
            }
            if (!(await Place.findOne({ id: placeId }))) throw new Error('Place not found');
            if (!(await Dish.findOne({ id: dishId }))) throw new Error('Dish not found');

            const values: Record<string, unknown> = {};
            if (localBalance !== undefined) values.localBalance = localBalance === UNLIMITED_BALANCE ? null : localBalance;
            if (enable !== undefined) values.enable = enable;

            const row: any = await DishPlace.upsertForPlace(dishId, placeId, values);
            const mode = await getDishPlaceBalanceMode();
            return {
                placeId,
                dishId,
                localBalance: row?.localBalance ?? null,
                rmsBalance: row?.rmsBalance ?? null,
                enable: row ? row.enable !== false : true,
                balance: row
                    ? getEffectiveBalance({ localBalance: row.localBalance, rmsBalance: row.rmsBalance, enable: row.enable, mode })
                    : UNLIMITED_BALANCE,
                // No row is the default state: unlimited and on.
                stored: Boolean(row),
            };
        },
    });
}
