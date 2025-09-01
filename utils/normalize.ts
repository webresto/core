import Decimal from "decimal.js";

export function normalizePercent(value: string | number | Decimal): Decimal {
  let d = new Decimal(value);

  // Если больше 1 — значит это "30", а не "0.3"
  if (d.greaterThan(1)) {
    d = d.div(100);
  }

  return d;
}