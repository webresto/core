/**
 * The one piece of geometry the delivery adapter owns.
 *
 * Distance is the adapter's question: the default answer is a straight line,
 * and an adapter with a routing API overrides `estimateTravel` rather than
 * teaching core about roads. Nothing outside `adapters/delivery` measures.
 */

/** Great-circle distance in kilometres. */
export function distanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const EARTH_RADIUS_KM = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
