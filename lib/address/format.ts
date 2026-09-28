/** "Ленина", "12" → "Ленина, 12". Empty parts drop out. */
export function formatAddressPath(names: (string | undefined | null)[]): string {
  return names
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter((name) => name !== "")
    .join(", ");
}

/**
 * The line an operator and a courier read, out of a chosen path and a house
 * number.
 *
 * Two rules, and they are the reason this is here rather than in `Order`: a
 * `range` leaves no word behind — "1–99" is how the catalog groups
 * houses, not an address — and a node that is the place to knock at already
 * carries its number, so the number is not written twice. Which nodes those are
 * is the geo adapter's `selfAddressed`.
 */
export function formatAddressLine(
  path: { type: string; name: string }[],
  home: string | null | undefined,
  selfAddressed: readonly string[],
): string {
  const names = path.filter((step) => step.type !== "range").map((step) => step.name);
  const leaf = path[path.length - 1];
  if (home && !(leaf && selfAddressed.includes(leaf.type))) names.push(home);
  return formatAddressPath(names);
}
