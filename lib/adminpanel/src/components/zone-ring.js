import Polygon from 'ol/geom/Polygon.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';

/**
 * Moving a zone ring between the database and the map.
 *
 * Rings are stored as `[lon, lat]` in EPSG:4326 — the order KML uses and the one
 * every other piece of zone code expects. OpenLayers works in EPSG:3857, so the
 * conversion happens here and nowhere else.
 *
 * Kept apart from the component so the geometry can be checked without a
 * browser: everything below is a pure function of its arguments.
 */

/** A ring the model would accept: at least three distinct points, all in range. */
export function isUsableRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false;

  const seen = new Set();
  for (const point of ring) {
    if (!Array.isArray(point) || point.length < 2) return false;
    const [lon, lat] = point;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
    if (Math.abs(lon) > 180 || Math.abs(lat) > 90) return false;
    seen.add(`${lon},${lat}`);
  }

  // A closed ring repeats its first point, so four entries can still be a
  // triangle — and three identical ones are not an area.
  return seen.size >= 3;
}

export function ringToGeometry(ring) {
  return new Polygon([ring.map(([lon, lat]) => fromLonLat([lon, lat]))]);
}

export function geometryToRing(geometry) {
  // Only the outer ring: a zone is one area, and a hole has no meaning in a
  // tariff — an unserved island is a second zone with its own terms.
  const [outer] = geometry.getCoordinates();

  return outer.map((point) => {
    const [lon, lat] = toLonLat(point);
    // Six decimals is about ten centimetres. Beyond that the digits are float
    // noise, and they would show up as a changed polygon on every save.
    return [round6(lon), round6(lat)];
  });
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}
