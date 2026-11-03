import { OrderRecord } from "../../models/Order";

/**
 * What a refusal of `Order.check` means, in one place (plan C8 of `order-entry.plan.md`).
 *
 * The storefront's resolver has carried this table since there was one surface taking orders
 * (`@webresto/graphql`, `resolvers/checkout.ts`); with a second one — the POS of the mobile app —
 * a copy would have drifted on the first new code. The words are the same as the site's, so a
 * customer and an operator are told the same thing about the same order.
 *
 * `key` is for a client with its own dictionary (the mobile API translates `order.error.<code>`),
 * `text` is the English sentence the storefront passes to its own i18n. A code nobody mapped —
 * a module's own, a bug — comes back as the generic refusal, never as silence.
 */

export interface OrderCheckFailure {
  /** The `code` core threw, when it threw one. */
  code: number | null;
  /** `order.error.<code>`, or `order.error.unknown`. */
  key: string;
  /** The English sentence, as the storefront words it. */
  text: string;
  /** What `%s` of the sentence stands for: the bonus balance of code 28, the estimate of 21. */
  arg?: string | number;
}

const TEXTS: Record<number, string> = {
  0: "It was not possible to check the order",
  1: "Enter the name of the customer",
  2: "Enter the customer's phone",
  3: "The wrong format of the name of the customer",
  4: "The wrong format of the customer phone number",
  5: "No address given",
  6: "Not indicated the house number",
  7: "The city is not indicated",
  8: "The payment system is not available",
  9: "The order date is not valid",
  10: "The date of execution of the order is not true",
  12: "The order has already been paid",
  13: "The cart is empty",
  14: "Failed to calculate the cart",
  15: "Ordering for a date in the past is not possible",
  16: "Date not allowed",
  17: "The date should account for the minimum delivery time; choose a slightly later time",
  19: "Ordering is temporarily unavailable",
  22: "This order cannot be prepared as one order right now. Please contact us.",
  23: "The chosen location is closed right now",
  24: "The chosen location does not take these orders",
  25: "This product takes longer to cook than the order will wait",
  26: "The kitchen of this area is closed now - choose a time it works at, or pickup",
  27: "This cart belongs to another account. Please start a new cart",
  29: "Paying with bonuses is not available now",
};

const GENERIC = TEXTS[0];

/**
 * The refusal as the one who asked should read it. [order] is only used for code 11, where the
 * delivery adapter's own message is the whole point.
 */
export function orderCheckFailure(error: any, order?: OrderRecord | null): OrderCheckFailure {
  const code: number | null = typeof error?.code === "number" ? error.code : null;
  const failure = (text: string, arg?: string | number): OrderCheckFailure => ({
    code,
    key: code === null ? "order.error.unknown" : `order.error.${code}`,
    text,
    ...(arg === undefined ? {} : { arg }),
  });

  if (code === null) return failure(GENERIC);

  // The three the table cannot hold: their words come from the order or from the throw itself.
  if (code === 11) return failure(order?.delivery?.message || "Delivery calculation error");
  if (code === 20) {
    // core uses 20 both for a cart that requires sign-in and for an order carrying a time and a
    // maximum wait at once.
    return error?.error === "authorization required"
      ? failure("Authorization required")
      : failure("Choose either a delivery time or a maximum wait, not both");
  }
  if (code === 21) return failure(typeof error?.error === "string" ? error.error : "The order cannot be ready that quickly");
  if (code === 28) return failure("Not enough bonuses: %s available", error?.available ?? 0);

  return failure(TEXTS[code] ?? GENERIC);
}

/** Every key this module can answer with: the dictionaries of the clients are checked against it. */
export function orderCheckKeys(): string[] {
  return [...Object.keys(TEXTS).map((code) => `order.error.${code}`), "order.error.11", "order.error.20", "order.error.21", "order.error.28", "order.error.unknown"]
    .filter((key, index, all) => all.indexOf(key) === index)
    .sort();
}
