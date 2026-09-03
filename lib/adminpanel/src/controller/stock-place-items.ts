import {
  getEffectiveBalance,
  getDishPlaceBalanceMode,
  DishPlaceBalanceMode,
  UNLIMITED_BALANCE,
} from "../../../dish-place-balance";
import { hasStockManagerPlaceAccess } from "./access-rights";

export interface StockProduct {
  id: string;
  name: string;
  code: string;
  price: number;
  enable: boolean;
  visible: boolean;
  isDeleted: boolean;
  /** Effective stock at the selected point: what availability logic uses. */
  balance: number;
  /** Operator value. `null` means the operator has not set one here. */
  localBalance: number | null;
  /** RMS value. `null` means RMS has not reported one here. */
  rmsBalance: number | null;
  /** Operator switch for this product at this point. */
  placeEnable: boolean;
}

export interface StockProductsResponse {
  results: StockProduct[];
  mode: DishPlaceBalanceMode;
}

export function readPlaceId(req: any): string | null {
  const value = req.method === "GET" ? req.query?.placeId : req.body?.placeId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Answers with JSON rather than `sendStatus`, which sends `text/plain`.
 *
 * Access to a point can be revoked while the page is open, so this is a normal
 * runtime answer the client has to act on, not a dead end: it needs a body it
 * can parse and a stable code to branch on.
 */
export async function requireStockPlaceAccess(req: any, res: any): Promise<string | null> {
  const placeId = readPlaceId(req);
  if (!placeId || !(await hasStockManagerPlaceAccess(req, placeId))) {
    const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
    res.status(403).json({
      error: t('Access to this cooking point is not granted'),
      code: 'STOCK_PLACE_FORBIDDEN',
    });
    return null;
  }
  return placeId;
}

/**
 * One row as the Stock Manager expects it after a write.
 *
 * `null` means the write emptied the row and it was deleted. No row is the
 * canonical way to say "sold here without a limit", so the answer reports the
 * same default state a product without a row has always had.
 */
export function toDishPlaceResponse(
  productId: string,
  placeId: string,
  dishPlace: any | null,
  mode: DishPlaceBalanceMode,
): Omit<StockProduct, "id" | "name" | "code" | "price" | "enable" | "visible" | "isDeleted"> & {
  productId: string;
  placeId: string;
} {
  const localBalance = dishPlace?.localBalance ?? null;
  const rmsBalance = dishPlace?.rmsBalance ?? null;
  const placeEnable = dishPlace?.enable !== false;

  return {
    productId,
    placeId,
    localBalance,
    rmsBalance,
    placeEnable,
    balance: getEffectiveBalance({ localBalance, rmsBalance, enable: placeEnable, mode }),
  };
}

function toStockProduct(
  product: any,
  dishPlace: any | undefined,
  mode: DishPlaceBalanceMode,
): StockProduct {
  const placeEnable = dishPlace?.enable !== false;
  return {
    id: product.id,
    name: product.name,
    code: product.code,
    price: product.price,
    enable: product.enable ?? true,
    visible: product.visible,
    isDeleted: product.isDeleted ?? false,
    balance: getEffectiveBalance({
      localBalance: dishPlace?.localBalance,
      rmsBalance: dishPlace?.rmsBalance,
      enable: placeEnable,
      mode,
    }),
    localBalance: dishPlace?.localBalance ?? null,
    rmsBalance: dishPlace?.rmsBalance ?? null,
    placeEnable,
  };
}

async function findDishPlaces(placeId: string, productIds: string[]): Promise<Map<string, any>> {
  if (!productIds.length) return new Map();
  const rows = await DishPlace.find({ where: { place: placeId, dish: { in: productIds } } });
  return new Map(rows.map((row: any) => [String(row.dish), row]));
}

/**
 * Lists catalog products for one cooking point.
 *
 * Products without a `DishPlace` row are included: no row means the product
 * is sold at every point without a limit, so hiding it would make most of the
 * catalog invisible to the operator.
 */
export async function getStockProducts(
  placeId: string,
  where: any,
  limit = 50,
): Promise<StockProductsResponse> {
  const mode = await getDishPlaceBalanceMode();
  const products = await Dish.find({ where, limit }).populate("images");
  const balancesByProduct = await findDishPlaces(placeId, products.map((product: any) => String(product.id)));

  return {
    results: products.map((product: any) => toStockProduct(product, balancesByProduct.get(String(product.id)), mode)),
    mode,
  };
}

/**
 * Lists products that are limited or stopped at this point.
 *
 * Driven from `DishPlace`, because that is the only place a limit can live:
 * an operator edit, an RMS stop list, or a disabled product all create a row.
 */
export async function getLimitedStockProducts(placeId: string, limit = 50): Promise<StockProductsResponse> {
  const mode = await getDishPlaceBalanceMode();
  const rows = await DishPlace.find({ where: { place: placeId } });

  const limited = rows.filter((row: any) => {
    const balance = getEffectiveBalance({
      localBalance: row.localBalance,
      rmsBalance: row.rmsBalance,
      enable: row.enable !== false,
      mode,
    });
    return balance !== UNLIMITED_BALANCE;
  });
  if (!limited.length) return { results: [], mode };

  const byProduct = new Map(limited.map((row: any) => [String(row.dish), row]));
  const products = await Dish.find({
    where: { isDeleted: false, id: { in: [...byProduct.keys()] } },
    limit,
  }).populate("images");

  return {
    results: products.map((product: any) => toStockProduct(product, byProduct.get(String(product.id)), mode)),
    mode,
  };
}
