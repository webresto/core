import Decimal from "decimal.js";

export function normalizePercent(value: string | number | Decimal): Decimal {
  let d = new Decimal(value);

  // If greater than 1 — it means this is "30", not "0.3"
  if (d.greaterThan(1)) {
    d = d.div(100);
  }

  return d;
}