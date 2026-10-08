/**
 * Coordinate helpers.
 *
 * Contract: `Address.coordinate` is exposed externally as `{lon: string, lat: string}` (BC).
 * Internal geometric calculations use `{lon: number, lat: number}`. This module is the
 * single conversion point between the two shapes.
 * TODO: review when new address system will it be
 */

export type CoordinateInput = { lon: string | number; lat: string | number };

export function toCoordinatePair(
  input: CoordinateInput | null | undefined
): { lon: number; lat: number } | null {
  if (!input) return null;
  const lon = typeof input.lon === "string" ? parseFloat(input.lon) : input.lon;
  const lat = typeof input.lat === "string" ? parseFloat(input.lat) : input.lat;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return { lon, lat };
}

export function toAddressCoordinate(
  coord: { lon: number; lat: number } | null
): { lon: string; lat: string } | undefined {
  if (!coord) return undefined;
  return { lon: String(coord.lon), lat: String(coord.lat) };
}
