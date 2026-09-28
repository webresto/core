import type { DishPlaceValues } from "../../models/DishPlace";
import { UNLIMITED_BALANCE } from "../menu/dish-place-balance";

export function isBalanceValue(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= -1);
}

/** `-1` and `null` both mean "this source reports no limit". */
export function limitsNothing(value: unknown): boolean {
  return value === null || value === undefined || value === UNLIMITED_BALANCE;
}

/**
 * A row that limits nothing and is enabled says exactly what a missing row says.
 *
 * The rule deliberately ignores the balance mode: the mode is a setting an
 * operator flips on a live system, while deleting a row is irreversible. Judging
 * emptiness by the active mode would throw away a real RMS value in `local-only`
 * with nowhere to get it back from after a switch to `minimum`.
 */
export function isEmptyRow(values: DishPlaceValues): boolean {
  return limitsNothing(values.localBalance) && limitsNothing(values.rmsBalance) && values.enable !== false;
}

/**
 * The state a row would end up in after the update.
 *
 * A caller writes one source and leaves the others out, so an absent key must
 * keep the stored value rather than read as "no limit" — otherwise writing
 * `rmsBalance: -1` would silently drop an operator stop stored next to it.
 */
export function mergeValues(existing: Partial<DishPlaceValues>, values: DishPlaceValues): DishPlaceValues {
  return {
    localBalance: values.localBalance !== undefined ? values.localBalance : (existing.localBalance ?? null),
    rmsBalance: values.rmsBalance !== undefined ? values.rmsBalance : (existing.rmsBalance ?? null),
    enable: values.enable !== undefined ? values.enable : existing.enable !== false,
  };
}
