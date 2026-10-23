import { Adapter } from '../../adapters';
import OrderAddress from '../../interfaces/OrderAddress';
import { kitchenOpensAt } from '../../lib/order/kitchen-assignment';

declare const mcp: any;

/**
 * What a customer at an address would be told, and which kitchen would cook:
 * the delivery adapter's answer for the address (zone, price, time, minimum)
 * and the menu adapter's kitchen chain for its coordinate, each with the
 * diagnostics that explain it. The same calls the storefront and checkout make,
 * so the answer is the one a customer gets, not a reconstruction of it.
 */
export function registerDeliveryTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'delivery-check',
        group: 'delivery-zones',
        description:
            'Checks delivery to an address the way the storefront does: allowed or not, zone, cost, time, minimum order, '
            + 'and which kitchen the chain would choose (with why). Give a coordinate (lat, lon), or a catalog node, or a typed address with its city.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                lat: { type: 'number', description: 'Latitude of the address.', example: 56.8399 },
                lon: { type: 'number', description: 'Longitude of the address.', example: 60.6145 },
                node: { type: 'string', description: 'Address catalog node (a house) instead of a coordinate.', example: 'abc123' },
                formatted: { type: 'string', description: 'Typed address, as a customer would enter it.', example: 'Ленина, 49' },
                home: { type: 'string', description: 'House number, when the node is a street.', example: '49' },
                city: { type: 'string', description: 'City (id or name). Kitchens are chosen in the address city only.', example: 'abc123' },
            },
        },
        handler: async ({ lat, lon, node, formatted, home, city }: Record<string, any>) => {
            const hasCoordinate = typeof lat === 'number' && typeof lon === 'number';
            if (!hasCoordinate && !node && !formatted) throw new Error('Give lat and lon, or node, or formatted');

            const address: OrderAddress = {
                ...(hasCoordinate ? { coordinate: { lat, lon } } : {}),
                ...(node ? { node } : {}),
                ...(formatted ? { formatted } : {}),
                ...(home ? { home } : {}),
                ...(city ? { city } : {}),
            };

            const geo = await Adapter.get('geo');
            const location = hasCoordinate
                ? { coordinate: { lat, lon }, diagnostics: ['coordinate given'] }
                : await geo.locate(address);

            const delivery = await (await Adapter.get('delivery')).checkAbility(address);

            const kitchen = await (await Adapter.get('menu')).resolveCookingPlace({
                serviceType: 'delivery',
                coordinate: location.coordinate ?? null,
                city: city ?? null,
            });
            const place = kitchen.placeId ? await Place.findOne({ id: kitchen.placeId }) : null;

            return {
                location,
                delivery,
                kitchen: {
                    placeId: kitchen.placeId,
                    title: place?.title ?? null,
                    address: place?.address ?? null,
                    strategy: kitchen.strategy,
                    diagnostics: kitchen.diagnostics,
                    // none now: when one opens and takes the address (YYYY-MM-DD HH:mm); undefined - none within a week
                    opensAt: !kitchen.placeId && location.coordinate ? (await kitchenOpensAt(location.coordinate, city ?? null)) ?? 'not within a week' : null,
                },
            };
        },
    });
}
