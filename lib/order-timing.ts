import { DeliveryCoordinate } from "../adapters/delivery/contracts";
import DeliveryAdapter from "../adapters/delivery/DeliveryAdapter";
import { AvailabilityProduct, getPreparationMinutes } from "./product-availability";

/**
 * When an order is promised, and whether that promise fits what was asked for.
 *
 * This is `Order`'s, not the delivery adapter's, and the file is named for that:
 * `resolveOrderTiming` and `fitsMaxWait` are about `order.date` and
 * `order.maxWaitMinutes` and never touch delivery at all, while the estimate
 * below owns only the cooking half. The road is the adapter's answer, so the
 * adapter is passed in rather than reached for — the same reason `matchZone`
 * takes one.
 *
 * One number, not a range. The range only ever came from the two cooking times
 * on a dish — the road and the safety margin are single figures — so once a dish
 * carries one time there is no second end to compute, and quoting "40–40" was
 * all the range had left to say.
 *
 * Nothing here decides whether an order may be placed. It produces an estimate;
 * `Order.checkDate` is where a promise that cannot be kept turns into a refusal.
 */

export interface DeliveryTimeEstimate {
  preparationMinutes: number;
  travelMinutes: number;
  distanceKm: number | null;
  travelSource: string;
  safetyMarginMinutes: number;
  /** What the customer is shown: "totalMinutes минут". */
  totalMinutes: number;
  diagnostics: string[];
}

async function readNumber(key: any, fallback: number): Promise<number> {
  const value = await Settings.get(key);
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export interface DeliveryTimeInput {
  /** Basket lines, for the cooking estimate. Only `dish` products count. */
  products: AvailabilityProduct[];
  kitchen: DeliveryCoordinate | null;
  customer: DeliveryCoordinate | null;
  /**
   * The floor on the delivery leg the adapter reported
   * (`Delivery.deliveryTimeMinutes`), when it reported one.
   *
   * Core never reads a zone to find it: whether the floor came from a zone's
   * terms or from the installation-wide setting is the adapter's business, and
   * asking here would mean core knowing about `DeliveryZone`.
   */
  minDeliveryMinutes?: number | null;
}

/**
 * The whole promise: cooking, then the road, plus a margin.
 *
 * ```text
 * deliveryMinutes = max(zone.minDeliveryTime, travelMinutes)
 * totalMinutes    = preparationMinutes + deliveryMinutes + safetyMargin
 * ```
 *
 * The zone's time is a floor rather than an alternative: an operator who wrote
 * "40 minutes minimum" into a zone meant it as a promise not to beat, and a
 * straight-line estimate of eleven minutes does not overrule them.
 *
 * `MIN_DELIVERY_TIME_IN_MINUTES` is the same floor for an installation with no
 * zones — it has always been the delivery promise there, and ignoring it now
 * would shorten every quoted time on every installation that has no zones.
 */
export async function estimateDeliveryTime(
  input: DeliveryTimeInput,
  adapter: DeliveryAdapter,
): Promise<DeliveryTimeEstimate> {
  const diagnostics: string[] = [];

  const preparation = getPreparationMinutes(input.products);
  const travel = await adapter.estimateTravel(input.kitchen, input.customer, diagnostics);
  const safetyMargin = await readNumber("DELIVERY_SAFETY_MARGIN_MINUTES", 0);

  // The adapter's floor when there is one, the installation-wide setting when
  // there is not — the latter for callers that estimate without a priced order.
  const installationFloor = await readNumber("MIN_DELIVERY_TIME_IN_MINUTES", 0);
  const floor = typeof input.minDeliveryMinutes === "number" && input.minDeliveryMinutes > 0
    ? input.minDeliveryMinutes
    : installationFloor;

  const travelMinutes = travel?.travelMinutes ?? 0;
  const deliveryMinutes = Math.max(floor, travelMinutes);

  if (floor > travelMinutes) {
    diagnostics.push(`delivery leg held at the floor of ${floor} min`);
  }

  return {
    preparationMinutes: preparation,
    travelMinutes,
    distanceKm: travel ? Math.round(travel.distanceKm * 100) / 100 : null,
    travelSource: travel?.source ?? "none",
    safetyMarginMinutes: safetyMargin,
    totalMinutes: preparation + deliveryMinutes + safetyMargin,
    diagnostics,
  };
}

export type OrderTimingCode = "ORDER_TIMING_AMBIGUOUS" | "ORDER_WAIT_TOO_SHORT";

export interface OrderTiming {
  /** Which mode the customer chose. */
  mode: "asap" | "scheduled";
  code?: OrderTimingCode;
  message?: string;
}

/**
 * Which of the two timing modes an order is in — and a refusal when it is both.
 *
 * `date` means "at this time", `maxWaitMinutes` means "as soon as you can, and
 * no later than this". Both filled in is not a stricter order; it is two orders,
 * and reconciling them would mean picking one behind the customer's back. So it
 * is refused, which is what "validate exactly one mode" asks for.
 *
 * Neither filled in is ASAP with no ceiling, which is what every order has been
 * until now and stays the default.
 */
export function resolveOrderTiming(order: {
  date?: string | null;
  maxWaitMinutes?: number | null;
}): OrderTiming {
  const scheduled = typeof order?.date === "string" && order.date.trim() !== "";
  const wait = typeof order?.maxWaitMinutes === "number" && Number.isFinite(order.maxWaitMinutes)
    ? order.maxWaitMinutes
    : null;

  if (scheduled && wait !== null) {
    return {
      mode: "scheduled",
      code: "ORDER_TIMING_AMBIGUOUS",
      message: "An order is either for a time or for a maximum wait, not both",
    };
  }

  if (wait !== null && wait <= 0) {
    return {
      mode: "asap",
      code: "ORDER_WAIT_TOO_SHORT",
      message: "Maximum wait must be a positive number of minutes",
    };
  }

  return { mode: scheduled ? "scheduled" : "asap" };
}

/**
 * Whether the estimate fits inside what the customer said they would wait.
 *
 * There is one number to compare against now, so the old question of which end
 * of the promise to judge by does not arise.
 */
export function fitsMaxWait(
  estimate: Pick<DeliveryTimeEstimate, "totalMinutes">,
  maxWaitMinutes: number | null | undefined,
): boolean {
  if (typeof maxWaitMinutes !== "number" || !Number.isFinite(maxWaitMinutes) || maxWaitMinutes <= 0) return true;
  return estimate.totalMinutes <= maxWaitMinutes;
}
