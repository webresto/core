import { formatAddressPath } from "./address/format";

/**
 * The whole line, house number included.
 *
 * A catalog line already ends with the number — `formatAddressLine` put it
 * there — and so does a line that came from a saved location. Free text keeps
 * the number in `home`, and without it two houses on one street would be one
 * location.
 */
export function wholeLine(formatted: string, home: string | undefined): string {
  const line = formatted.trim();
  const number = home?.trim();
  if (!number || line.slice(line.lastIndexOf(",") + 1).trim() === number) return line;
  return formatAddressPath([line, number]);
}
