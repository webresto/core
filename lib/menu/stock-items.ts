import {
  getEffectiveBalance,
  getDishPlaceBalanceMode,
  DishPlaceBalanceMode,
  UNLIMITED_BALANCE,
} from "./dish-place-balance";

/**
 * The stock of one cooking point, as a public function of core (plan C4).
 *
 * These used to live in `lib/adminpanel/src/controller/stock-place-items.ts`, next to the HTTP
 * handlers of the web Stock Manager — and the mobile API had to reach into the panel's controller
 * folder to read the very same numbers. The behaviour is unchanged: one source for the web page,
 * for the mobile app and for anything else that asks what a point has.
 *
 * What stays in the controller file is what is about a *request*: reading `placeId` out of it and
 * refusing it with the panel's own answer.
 */

declare const Dish: any;
declare const DishPlace: any;

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
