import { getDishPlaceBalanceMode, UNLIMITED_BALANCE } from "../../../dish-place-balance";
import { requireStockManagerAccess } from "./access-rights";
import { requireStockPlaceAccess, toDishPlaceResponse } from "./stock-place-items";

/**
 * Writes the operator stock of one product at one cooking point.
 *
 * The `DishPlace` row is created on demand: before the first edit a product
 * has no row at all, which means "sold here without a limit".
 */
export default async function UpdateStockController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  try {
    if (!requireStockManagerAccess(req, res)) return;
    const placeId = await requireStockPlaceAccess(req, res);
    if (!placeId) return;

    const { id, balance } = req.body;

    if (!id || typeof balance !== 'number' || !Number.isFinite(balance) || balance < UNLIMITED_BALANCE) {
      return res.status(400).json({ error: t('Invalid id or balance') });
    }

    const product = await Dish.findOne({ id });
    if (!product) {
      return res.status(404).json({ error: t('Product not found') });
    }

    const dishPlace = await DishPlace.upsertForPlace(id, placeId, { localBalance: balance });
    const mode = await getDishPlaceBalanceMode();

    return res.json({
      success: true,
      mode,
      dishPlace: toDishPlaceResponse(id, placeId, dishPlace, mode),
    });
  } catch (error) {
    sails.log.error('Update stock error', error);
    return res.status(500).json({ error: String(error) });
  }
}
