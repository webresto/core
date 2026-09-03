import { requireStockManagerAccess } from "./access-rights";
import { getStockProducts, requireStockPlaceAccess } from "./stock-place-items";

export default async function StockManagerSearchController(req: any, res: any) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    if (!requireStockManagerAccess(req, res)) return;
    const placeId = await requireStockPlaceAccess(req, res);
    if (!placeId) return;

    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ results: [] });

    const where: any = {
      isDeleted: false
    };

    // Search by name or code (contains)
    where.or = [
      { name: { contains: q } },
      { code: { contains: q } }
    ];

    const { results, mode } = await getStockProducts(placeId, where, 50);

    return res.json({ results, mode });
  } catch (error) {
    sails.log.error('StockManager search error', error);
    return res.status(500).json({ error: String(error) });
  }
}
