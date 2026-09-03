import { getDishPlaceBalanceMode } from "../../../dish-place-balance";
import { requireStockManagerAccess } from "./access-rights";
import { requireStockPlaceAccess, toDishPlaceResponse } from "./stock-place-items";

/**
 * Turns one product on or off at one cooking point.
 *
 * This is a point-local switch, not the catalog-wide `Dish.enable`: disabling
 * here stops the product at this kitchen only and wins over both balances.
 */
export default async function UpdateDishPlaceEnableController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  try {
    if (!requireStockManagerAccess(req, res)) return;
    const placeId = await requireStockPlaceAccess(req, res);
    if (!placeId) return;

    const { id, enable } = req.body;

    if (!id || typeof enable !== 'boolean') {
      return res.status(400).json({ error: t('Invalid id or enable') });
    }

    const product = await Dish.findOne({ id });
    if (!product) {
      return res.status(404).json({ error: t('Product not found') });
    }

    const dishPlace = await DishPlace.upsertForPlace(id, placeId, { enable });
    const mode = await getDishPlaceBalanceMode();

    return res.json({
      success: true,
      mode,
      dishPlace: toDishPlaceResponse(id, placeId, dishPlace, mode),
    });
  } catch (error) {
    sails.log.error('Update product place enable error', error);
    return res.status(500).json({ error: String(error) });
  }
}
