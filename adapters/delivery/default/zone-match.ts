import { DeliveryCoordinate } from "../contracts";
import { distanceKm } from "../geo";

/**
 * Zone geometry: validation and finding the zone a coordinate falls into.
 *
 * Deliberately dependency-free, down to importing no model. The legacy module
 * pulled in all of `@turf/turf` for one predicate; core needs point-in-polygon
 * and nothing else, and a zone polygon is a simple ring, not a multipolygon
 * with holes.
 */

/** Polygons are stored as `[lon, lat]`, which is the order KML uses. */
type Ring = number[][];

/** The shape of a zone this module needs; the model satisfies it. */
interface ZoneGeometry {
  id?: string;
  polygon?: number[][];
}

/**
 * A ring of `[lon, lat]` pairs, in that order — the order KML uses and the
 * order the legacy module stored, so stored polygons keep working untouched.
 */
export function isValidPolygon(value: unknown): value is number[][] {
  if (!Array.isArray(value) || value.length < 3) return false;

  const seen = new Set<string>();
  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2) return false;
    const [lon, lat] = point;
    if (typeof lon !== "number" || !Number.isFinite(lon) || lon < -180 || lon > 180) return false;
    if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) return false;
    seen.add(`${lon},${lat}`);
  }

  // A closed ring repeats its first point, so three stored points can still be a
  // degenerate line. Three *distinct* ones are the real minimum for an area.
  return seen.size >= 3;
}

/**
 * Ray casting: count how often a ray going right from the point crosses the
 * ring. An odd count means inside. Points exactly on an edge are reported as
 * inside, so an address on a zone border is served rather than rejected.
 */
export function isPointInRing(coordinate: DeliveryCoordinate, ring: Ring): boolean {
  const x = coordinate.lng;
  const y = coordinate.lat;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    // On the edge itself: treat as inside and stop, because the crossing count
    // is ambiguous exactly there.
    const cross = (xj - xi) * (y - yi) - (yj - yi) * (x - xi);
    if (
      Math.abs(cross) < 1e-12 &&
      x >= Math.min(xi, xj) - 1e-12 &&
      x <= Math.max(xi, xj) + 1e-12 &&
      y >= Math.min(yi, yj) - 1e-12 &&
      y <= Math.max(yi, yj) + 1e-12
    ) {
      return true;
    }

    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

/**
 * The first zone containing the coordinate, in `sortOrder`.
 *
 * Overlaps are resolved by order and the search stops at the first hit — the
 * behaviour operators already rely on to put a small expensive zone above the
 * large cheap one that contains it.
 */
export function findZoneForCoordinate<T extends ZoneGeometry>(
  zones: T[],
  coordinate: DeliveryCoordinate,
): T | null {
  for (const zone of zones) {
    if (!isValidPolygon(zone.polygon)) continue;
    if (isPointInRing(coordinate, zone.polygon)) return zone;
  }
  return null;
}

/** A kitchen as the zone picker sees it: an id and where it stands. */
export interface PlaceCandidate {
  id: string;
  coordinate: DeliveryCoordinate | null;
}

/**
 * The kitchen that serves a zone: the one standing inside its polygon.
 *
 * Several inside → the nearest to the customer by straight line, ties by id,
 * the same determinism `nearest-geo` keeps. None inside → `null`, and the
 * caller decides what that means; here it is only geometry.
 */
export function nearestPlaceInZone(
  zone: ZoneGeometry,
  coordinate: DeliveryCoordinate,
  candidates: PlaceCandidate[],
): string | null {
  if (!isValidPolygon(zone.polygon)) return null;
  const ring = zone.polygon;

  let best: { id: string; km: number } | null = null;
  for (const candidate of candidates) {
    if (!candidate.coordinate || !isPointInRing(candidate.coordinate, ring)) continue;
    const km = distanceKm(coordinate, candidate.coordinate);
    if (!best || km < best.km || (km === best.km && candidate.id.localeCompare(best.id) < 0)) {
      best = { id: candidate.id, km };
    }
  }
  return best?.id ?? null;
}
