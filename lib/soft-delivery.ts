import { Delivery } from "../adapters/delivery/contracts";

/**
 * Soft delivery calculation — what to answer when the cost cannot be worked out.
 *
 * `SOFT_DELIVERY_CALCULATION` is on by default, and checkout under it does not
 * throw `code: 11`: the order is accepted and a manager agrees the cost by
 * phone. So an address the calculation cannot price is not a refusal, and
 * saying "we do not deliver there" is simply wrong — the system takes the
 * order anyway.
 *
 * The rule lives here, in one function, because two places have to give the
 * same answer: `Order.countCart` while counting a cart, and the delivery
 * adapter while `checkDeliveryAbility` answers the address form. Two copies of
 * it are two stories told to the same customer, and the customer meets both
 * within one minute.
 *
 * Returns `null` when the setting is off — the caller keeps its own refusal.
 */
export async function softDeliveryFallback(diagnostics: string[] = []): Promise<Delivery | null> {
  const enabled = await Settings.get("SOFT_DELIVERY_CALCULATION");
  if (!enabled) return null;

  return {
    allowed: true,
    deliveryTimeMinutes: null,
    cost: null,
    item: undefined,
    // Deliberately not `hasError`: that flag means the calculation itself broke
    // (an exception, a dead geocoder). An address outside the served area is a
    // business answer, and the front-end renders errors and notices differently.
    deliveryLocationUnrecognized: true,
    message: await softDeliveryMessage(),
    diagnostics,
  };
}

/** The operator's "a manager will call you" text, or a usable default. */
export async function softDeliveryMessage(): Promise<string> {
  const message = await Settings.get("SOFT_DELIVERY_CALCULATION_MESSAGE");

  // Anything but a non-empty string means the operator never set it. Guarded by
  // value rather than by trust: this setting was declared `boolean` for years,
  // which coerced every message an operator typed into `false`.
  return typeof message === "string" && message
    ? message
    : sails.__("Shipping cost cannot be calculated");
}
