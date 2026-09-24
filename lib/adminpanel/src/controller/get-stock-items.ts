import { requireStockManagerAccess } from "./access-rights";
import { getLimitedStockProducts, requireStockPlaceAccess } from "./stock-place-items";

export default async function GetStockItemsController(req: any, res: any) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    if (!requireStockManagerAccess(req, res)) return;
    const placeId = await requireStockPlaceAccess(req, res);
    if (!placeId) return;

    const { results, mode } = await getLimitedStockProducts(placeId, 50);

    return res.json({ results, mode });
  } catch (error) {
    sails.log.error('Get stock items error', error);
    return res.status(500).json({ error: String(error) });
  }
}
