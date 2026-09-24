/**
 * The other shape a drawn map arrives in.
 *
 * KML comes from Google My Maps; GeoJSON comes from everything else — QGIS,
 * geojson.io, an export out of some city's open data. Both end up as the same
 * thing here: a name and a ring, which is all a local zone is.
 *
 * Nothing about identity, synchronisation or ownership lives in this file. A
 * file the operator picked is read once and forgotten; the zones it creates are
 * theirs from that moment on.
 */

/** A polygon out of a file, before it is a row. */
export interface LocalZoneGeometry {
  name: string;
  /** Ring of `[lon, lat]` pairs, the order GeoJSON itself uses. */
  polygon: number[][];
}

/** `[lon, lat, alt?]` positions, keeping the two dimensions a zone has. */
function toRing(coordinates: unknown): number[][] {
  if (!Array.isArray(coordinates)) return [];

  const ring: number[][] = [];
  for (const position of coordinates) {
    if (!Array.isArray(position) || position.length < 2) continue;
    const lon = Number(position[0]);
    const lat = Number(position[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    ring.push([lon, lat]);
  }

  return ring;
}

function featuresOf(document: any): any[] {
  if (document?.type === "FeatureCollection") return Array.isArray(document.features) ? document.features : [];
  if (document?.type === "Feature") return [document];
  throw new Error('GeoJSON must be a Feature or a FeatureCollection');
}

/**
 * Turns a GeoJSON document into zones.
 *
 * Only the outer ring of a polygon is taken: `DeliveryZone.polygon` is one ring,
 * and a hole in a delivery area is a second zone drawn around it, not a property
 * of the first. A `MultiPolygon` becomes one zone per polygon for the same
 * reason — a zone is a shape, and two islands are two of them.
 *
 * Whether a ring can enclose an area is not asked here. A hand-drawn map often
 * carries a stray two-click shape, and the operator is told about it by name
 * when the zones are written — so every polygon the file has comes out, and
 * `importLocalZones` is the one place that decides which of them is a zone.
 */
export function parseGeoJson(text: string): LocalZoneGeometry[] {
  let document: any;
  try {
    document = JSON.parse(text);
  } catch (error) {
    throw new Error(`File is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const zones: LocalZoneGeometry[] = [];

  for (const [index, feature] of featuresOf(document).entries()) {
    const geometry = feature?.geometry;
    const name = typeof feature?.properties?.name === "string" && feature.properties.name.trim()
      ? feature.properties.name.trim()
      : `Zone ${index + 1}`;

    if (geometry?.type === "Polygon") {
      zones.push({ name, polygon: toRing(geometry.coordinates?.[0]) });
      continue;
    }

    if (geometry?.type === "MultiPolygon") {
      for (const [part, polygon] of (geometry.coordinates ?? []).entries()) {
        zones.push({ name: `${name} #${part + 1}`, polygon: toRing(polygon?.[0]) });
      }
    }

    // A point or a line is not a zone; other geometry types are simply not ours.
  }

  if (!zones.length) {
    throw new Error("GeoJSON contains no polygon");
  }

  return zones;
}
