import axios from "axios";
import { parseStringPromise } from "xml2js";
import { DeliveryZoneSnapshot, ImportedDeliveryZone } from "../contracts";

/**
 * Where the default adapter's zone geometry comes from: a KML document, in
 * practice a Google My Maps link.
 *
 * It downloads, parses and validates, and does nothing else — no database, no
 * timer, no opinion about when the next run should happen. `DeliveryZoneSyncService`
 * owns all of that, which is what lets a failed download leave the map exactly
 * as it was.
 */

/**
 * The name written into `DeliveryZone.source` on every imported row.
 *
 * Load-bearing, not a label: the ownership rules decide whether a zone may be
 * edited by comparing that stored string against this one. Rename it and every
 * already-imported zone stops matching — it silently becomes editable, and the
 * next run imports the same areas again as new zones competing for the same
 * addresses.
 */
export const KML_SOURCE_NAME = "kml";

export interface KmlZone {
  externalId: string;
  name: string;
  description?: string;
  /** Ring of `[lon, lat]` pairs, the order KML itself uses. */
  polygon: number[][];
  /**
   * The folder this placemark sits in, when the map has folders.
   *
   * My Maps calls them layers and puts every placemark in one; a hand-made KML
   * often has none, and then a zone simply has no layer. Placemarks are never
   * grouped by name: the first map that names things differently would be
   * grouped wrongly, and a wrong grouping silently reprices zones.
   */
  layer?: { externalId: string; name: string };
}

/**
 * A folder's identifier, namespaced away from placemark ids.
 *
 * Layers and zones share one identity space inside a source and a city, and a
 * folder called "North" next to a placemark whose external id is "North" would
 * otherwise be the same row. The name is the only stable thing a KML folder
 * has — there is no ExtendedData on folders in My Maps exports — so renaming a
 * folder upstream creates a new layer and abandons the old one, which is the
 * same trade the `name` strategy makes for zones.
 */
function layerIdOf(name: string): string {
  return `layer:${name}`;
}

/**
 * Where the stable identifier of a zone comes from.
 *
 * `name` is offered but never chosen automatically. Renaming a zone in the map
 * would then look like deleting one and creating another, and every manual
 * setting attached to the old row — kitchen, tariff, worktime — would be
 * stranded on a zone the source no longer lists.
 */
export type ExternalIdSource = "placemark-id" | "extended-data" | "name";

export interface KmlSourceConfig {
  /** Google My Maps viewer link or a direct KML URL. */
  url?: string;
  timeoutMs?: number;
  /** Explicit choice; by default the id and then ExtendedData are tried. */
  externalIdSource?: ExternalIdSource;
  /** Which `ExtendedData` field carries the identifier. */
  extendedDataField?: string;
  /** Lets the map own zone descriptions too. Off by default. */
  updateDescriptions?: boolean;
}

export class KmlSourceError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "KmlSourceError";
    this.code = code;
  }
}

/**
 * Rewrites a My Maps viewer link into its KML export.
 *
 * A link that is already a KML export, or any other direct URL, is returned as
 * it is — the source does not have to be Google.
 */
export function toKmlUrl(url: string): string {
  if (!url || typeof url !== "string") {
    throw new KmlSourceError("DELIVERY_ZONE_SOURCE_URL_MISSING", "Zone source URL is not configured");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new KmlSourceError("DELIVERY_ZONE_SOURCE_URL_INVALID", `Zone source URL is not a URL: ${url}`);
  }

  const mid = parsed.searchParams.get("mid");
  if (!mid) {
    // No `mid` means this is not a My Maps document; assume the URL already
    // points at something that returns KML.
    return parsed.toString();
  }

  const exportUrl = new URL("https://www.google.com/maps/d/kml");
  exportUrl.searchParams.set("mid", mid);
  exportUrl.searchParams.set("forcekml", "1");
  return exportUrl.toString();
}

function firstValue(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return firstValue(value[0]);
  if (typeof value === "object") return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

/** Reads `<ExtendedData><Data name="..."><value>` pairs. */
function extendedData(placemark: any): Record<string, string> {
  const result: Record<string, string> = {};
  const blocks = placemark?.ExtendedData;
  if (!Array.isArray(blocks)) return result;

  for (const block of blocks) {
    for (const entry of block?.Data ?? []) {
      const key = entry?.$?.name;
      const value = firstValue(entry?.value);
      if (key && value !== undefined) result[key] = value;
    }
  }

  return result;
}

/**
 * Parses the `<coordinates>` blob: whitespace-separated `lon,lat[,alt]` tuples.
 */
export function parseCoordinates(raw: string): number[][] {
  const points: number[][] = [];

  for (const chunk of String(raw).trim().split(/\s+/)) {
    if (!chunk) continue;
    const [lon, lat] = chunk.split(",");
    const parsedLon = parseFloat(lon);
    const parsedLat = parseFloat(lat);
    if (!Number.isFinite(parsedLon) || !Number.isFinite(parsedLat)) continue;
    points.push([parsedLon, parsedLat]);
  }

  return points;
}

/** Three distinct points and coordinates inside the world. */
export function isUsableRing(ring: number[][]): boolean {
  if (!Array.isArray(ring) || ring.length < 3) return false;

  const distinct = new Set<string>();
  for (const [lon, lat] of ring) {
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return false;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return false;
    distinct.add(`${lon},${lat}`);
  }

  return distinct.size >= 3;
}

function outerRingOf(placemark: any): number[][] | null {
  const raw = placemark?.Polygon?.[0]?.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0];
  if (!raw) return null;
  return parseCoordinates(raw);
}

function externalIdOf(placemark: any, name: string, config: KmlSourceConfig): string | null {
  const field = config.extendedDataField ?? "externalId";
  const data = extendedData(placemark);
  const placemarkId = placemark?.$?.id ? String(placemark.$.id).trim() : undefined;

  switch (config.externalIdSource) {
    case "placemark-id":
      return placemarkId || null;
    case "extended-data":
      return data[field] || null;
    case "name":
      // Explicit operator choice only. Documented as unstable.
      return name || null;
    default:
      return placemarkId || data[field] || null;
  }
}

/**
 * Turns a KML document into zones.
 *
 * A placemark without a stable identifier fails the whole parse rather than
 * being skipped or given a generated key: a partial import is how manual
 * settings get orphaned.
 */
export async function parseKml(xml: string, config: KmlSourceConfig = {}): Promise<KmlZone[]> {
  let document: any;
  try {
    document = await parseStringPromise(xml);
  } catch (error) {
    throw new KmlSourceError(
      "DELIVERY_ZONE_KML_UNPARSEABLE",
      `Zone source did not return usable KML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const root = document?.kml?.Document?.[0];
  if (!root) {
    throw new KmlSourceError("DELIVERY_ZONE_KML_UNPARSEABLE", "KML has no Document element");
  }

  // My Maps groups placemarks into layers; a hand-made KML often has none.
  // Placemarks sitting directly on the Document belong to no layer.
  const containers: Array<{ node: any; layer?: { externalId: string; name: string } }> = [
    { node: root },
    ...(root.Folder ?? []).map((folder: any) => {
      const name = firstValue(folder?.name) ?? "";
      return name ? { node: folder, layer: { externalId: layerIdOf(name), name } } : { node: folder };
    }),
  ];

  const zones: KmlZone[] = [];
  const seen = new Set<string>();

  for (const { node: container, layer } of containers) {
    for (const placemark of container?.Placemark ?? []) {
      const ring = outerRingOf(placemark);
      if (!ring) continue; // A pin or a line, not a zone.

      const name = firstValue(placemark?.name) ?? "";
      if (!isUsableRing(ring)) {
        throw new KmlSourceError(
          "DELIVERY_ZONE_GEOMETRY_INVALID",
          `Zone "${name || "(unnamed)"}" has a polygon that cannot enclose an area`,
        );
      }

      const externalId = externalIdOf(placemark, name, config);
      if (!externalId) {
        throw new KmlSourceError(
          "DELIVERY_ZONE_EXTERNAL_ID_MISSING",
          `Zone "${name || "(unnamed)"}" has no stable external id. Add one to the map's ExtendedData, ` +
            `or set externalIdSource to "name" in the source configuration and accept that renaming a zone ` +
            `will detach its local settings.`,
        );
      }

      if (seen.has(externalId)) {
        throw new KmlSourceError(
          "DELIVERY_ZONE_EXTERNAL_ID_DUPLICATE",
          `External id "${externalId}" is used by more than one zone in the source`,
        );
      }
      seen.add(externalId);

      zones.push({
        externalId,
        name: name || externalId,
        description: firstValue(placemark?.description),
        polygon: ring,
        ...(layer ? { layer } : {}),
      });
    }
  }

  if (!zones.length) {
    throw new KmlSourceError("DELIVERY_ZONE_SOURCE_EMPTY", "Zone source contains no polygons");
  }

  return zones;
}

/**
 * Downloads the document and returns the zones it describes.
 *
 * Every failure throws before anything is returned, so the sync has nothing to
 * apply: a network error, an unreadable document or one zone without a stable
 * identifier all leave the existing zones untouched.
 */
export async function fetchKmlZones(config: KmlSourceConfig = {}): Promise<DeliveryZoneSnapshot> {
  if (!config.url) {
    throw new KmlSourceError(
      "DELIVERY_ZONE_SOURCE_URL_MISSING",
      'Set the map URL in DELIVERY_ZONE_SYNC_CONFIG, for example {"url": "https://www.google.com/maps/d/viewer?mid=..."}',
    );
  }

  const url = toKmlUrl(config.url);
  const timeout = config.timeoutMs ?? 20000;

  let xml: string;
  try {
    const response = await axios.get(url, {
      timeout,
      responseType: "text",
      // A My Maps export answers with a redirect chain; anything else is an
      // error worth failing on rather than parsing.
      validateStatus: (status) => status >= 200 && status < 300,
    });
    xml = typeof response.data === "string" ? response.data : String(response.data);
  } catch (error) {
    if (error instanceof KmlSourceError) throw error;
    throw new KmlSourceError(
      "DELIVERY_ZONE_SOURCE_UNREACHABLE",
      `Could not download the zone source: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const zones = await parseKml(xml, config);

  return {
    source: KML_SOURCE_NAME,
    fetchedAt: new Date().toISOString(),
    updateDescriptions: config.updateDescriptions === true,
    zones: zones.map((zone): ImportedDeliveryZone => ({
      externalId: zone.externalId,
      name: zone.name,
      description: zone.description,
      polygon: zone.polygon,
      ...(zone.layer ? { layer: zone.layer } : {}),
    })),
  };
}
