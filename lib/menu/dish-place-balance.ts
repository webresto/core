export type DishPlaceBalanceMode = "local-only" | "rms-only" | "minimum";

export const DISH_PLACE_BALANCE_MODES: DishPlaceBalanceMode[] = ["local-only", "rms-only", "minimum"];

export const DEFAULT_DISH_PLACE_BALANCE_MODE: DishPlaceBalanceMode = "minimum";

/** Unlimited stock. A product with no `DishPlace` row is unlimited everywhere. */
export const UNLIMITED_BALANCE = -1;

export interface EffectiveBalanceInput {
  localBalance: number | null | undefined;
  rmsBalance: number | null | undefined;
  /** `false` disables the product at this place; missing means enabled. */
  enable?: boolean | null;
  mode: DishPlaceBalanceMode;
}

function isBalance(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= UNLIMITED_BALANCE;
}

export function normalizeBalanceMode(value: unknown): DishPlaceBalanceMode {
  return DISH_PLACE_BALANCE_MODES.includes(value as DishPlaceBalanceMode)
    ? (value as DishPlaceBalanceMode)
    : DEFAULT_DISH_PLACE_BALANCE_MODE;
}

/**
 * Calculates the quantity exposed at one cooking point.
 *
 * `-1` means unlimited stock, `0` is a stop. A product without a `DishPlace`
 * row is sold everywhere without a limit, so absent local/RMS values mean "this
 * source said nothing" and fall back to unlimited instead of inventing a stop.
 * `enable: false` is an operator stop and wins over every balance.
 */
export function getEffectiveBalance({
  localBalance,
  rmsBalance,
  enable,
  mode,
}: EffectiveBalanceInput): number {
  if (enable === false) return 0;

  const local = isBalance(localBalance) ? localBalance : null;
  const rms = isBalance(rmsBalance) ? rmsBalance : null;

  if (mode === "local-only") return local ?? UNLIMITED_BALANCE;
  if (mode === "rms-only") return rms ?? UNLIMITED_BALANCE;

  const limited = [local, rms].filter((value): value is number => value !== null && value !== UNLIMITED_BALANCE);
  return limited.length ? Math.min(...limited) : UNLIMITED_BALANCE;
}

/** Reads the configured mode, falling back to the safe default. */
export async function getDishPlaceBalanceMode(): Promise<DishPlaceBalanceMode> {
  return normalizeBalanceMode(await Settings.get("DISH_PLACE_BALANCE_MODE"));
}

/**
 * Effective stock of many products at one point, in one query.
 *
 * Only products that actually have a row are present in the result: a missing
 * key means "no source ever spoke about this pair", which is unlimited stock.
 * A `null` place (no cooking point configured at all) yields an empty map for
 * the same reason.
 */
export async function getEffectiveBalances(
  productIds: string[],
  placeId: string | null,
): Promise<Map<string, number>> {
  const balances = new Map<string, number>();
  if (!placeId || !productIds.length) return balances;

  const mode = await getDishPlaceBalanceMode();
  const rows = await DishPlace.find({ where: { place: placeId, dish: { in: productIds } } });

  for (const row of rows) {
    balances.set(
      String(row.dish),
      getEffectiveBalance({
        localBalance: row.localBalance,
        rmsBalance: row.rmsBalance,
        enable: row.enable !== false,
        mode,
      }),
    );
  }
  return balances;
}

/** Reads one value out of `getEffectiveBalances`, treating a missing row as unlimited. */
export function readEffectiveBalance(balances: Map<string, number>, productId: unknown): number {
  return balances.get(String(productId)) ?? UNLIMITED_BALANCE;
}

/** Effective stock of a single product at one point. */
export async function getEffectiveBalanceFor(productId: string, placeId: string | null): Promise<number> {
  return readEffectiveBalance(await getEffectiveBalances([productId], placeId), productId);
}

/** `0` is the only value that stops a sale; `-1` and any positive number do not. */
export function isStopped(balance: number): boolean {
  return balance === 0;
}
