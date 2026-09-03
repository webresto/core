import axios from "axios";
import { DeliveryCoordinate, DeliveryLocationSearchResult } from "../contracts";

/**
 * Nominatim as the geocoder and search backend of the default adapter.
 *
 * The address and organization searches are two different queries against two
 * different sets of OSM classes, not one query filtered afterwards. That is
 * what makes "Svobody st, 35" incapable of returning the laundry at that
 * address: the laundry is never in the result set to begin with.
 *
 * A failed lookup is an empty list rather than an exception. Address search runs
 * while somebody types, and a geocoder that is briefly unreachable must not take
 * the checkout form down with it — the refusal that does matter comes later,
 * from the resolution rule, once a selection has been made.
 */

export interface NominatimResult {
  place_id?: number | string;
  osm_type?: string;
  osm_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  class?: string;
  type?: string;
  address?: Record<string, string>;
  boundingbox?: string[];
}

/** OSM classes that describe a place to deliver *to*: streets and buildings. */
const ADDRESS_CLASSES = new Set(["place", "highway", "building", "boundary"]);

/** OSM classes that describe an organization or a landmark. */
const ORGANIZATION_CLASSES = new Set(["amenity", "shop", "tourism", "office", "leisure", "historic", "craft", "healthcare"]);

const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_TIMEOUT_MS = 10000;

export async function nominatimBaseUrl(): Promise<string> {
  const configured = await Settings.get("NOMINATIM_URL");
  const url = typeof configured === "string" && configured.trim() ? configured.trim() : DEFAULT_BASE_URL;
  return url.replace(/\/+$/, "");
}

async function get(path: string, params: Record<string, string | number>): Promise<NominatimResult[]> {
  const base = await nominatimBaseUrl();
  const search = new URLSearchParams({ format: "json", addressdetails: "1", ...params } as any);

  const response = await axios.get(`${base}/${path}?${search.toString()}`, {
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      // Nominatim's usage policy requires an identifying User-Agent.
      "User-Agent": `webresto-core/${process.env.npm_package_version ?? "1.0"}`,
      "Accept-Language": (await Settings.get("DEFAULT_LOCALE")) || "en",
    },
  });

  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Streets and houses only.
 *
 * The city is a parameter, never a setting. This install serves several cities,
 * so the only one that may narrow a customer's search is the one they named.
 */
export async function searchAddresses(query: string, city?: string, limit = 10): Promise<NominatimResult[]> {
  const results = await get("search", { q: city ? `${query}, ${city}` : query, limit: limit * 3 });
  return results.filter((row) => ADDRESS_CLASSES.has(row.class ?? "")).slice(0, limit);
}

/** Organizations and landmarks only. */
export async function searchOrganizations(query: string, city?: string, limit = 10): Promise<NominatimResult[]> {
  const results = await get("search", { q: city ? `${query}, ${city}` : query, limit: limit * 3 });
  return results.filter((row) => ORGANIZATION_CLASSES.has(row.class ?? "")).slice(0, limit);
}

/**
 * Geocodes an address.
 *
 * It takes the parts separately rather than a free string so a caller cannot
 * pass an organization name here by accident.
 */
export async function geocodeAddress(parts: { street: string; home: string; city?: string }): Promise<{ lat: number; lng: number } | null> {
  const query = [parts.city, parts.street, parts.home].filter(Boolean).join(", ");
  const results = await get("search", { q: query, limit: 1 });

  const first = results[0];
  if (!first?.lat || !first?.lon) return null;

  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

/**
 * `street`, `house_number` and the city as Nominatim reports them.
 *
 * The city is read back off the result rather than echoed from the query: a
 * suburb search can land in the neighbouring municipality, and the selection has
 * to carry the city it actually is, since that is what qualifies it later.
 */
export function addressPartsOf(result: NominatimResult): { street?: string; home?: string; city?: string } {
  const address = result.address ?? {};
  return {
    street: address.road ?? address.pedestrian ?? address.footway ?? undefined,
    home: address.house_number ?? undefined,
    city: address.city ?? address.town ?? address.village ?? address.municipality ?? undefined,
  };
}

function coordinateOf(result: NominatimResult): DeliveryCoordinate | undefined {
  if (!result.lat || !result.lon) return undefined;
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function idOf(result: NominatimResult): string {
  return String(result.place_id ?? `${result.osm_type}:${result.osm_id}`);
}

/** Streets and houses, shaped for the storefront. An organization at the same address is not offered. */
export async function searchAddressLocations(query: string, city?: string): Promise<DeliveryLocationSearchResult[]> {
  if (!query || !query.trim()) return [];

  try {
    const results = await searchAddresses(query.trim(), city);
    return results.map((result) => {
      const parts = addressPartsOf(result);
      return {
        id: idOf(result),
        kind: "street" as const,
        label: result.display_name ?? [parts.street, parts.home].filter(Boolean).join(", "),
        street: parts.street,
        home: parts.home,
        // What the result says it is, falling back to what was asked for. The
        // selection has to carry a city, because that is all a later geocode of
        // it has to go on.
        city: parts.city ?? city,
        coordinate: coordinateOf(result),
      };
    });
  } catch (error) {
    sails.log.error("Nominatim geocoder > address search failed", error);
    return [];
  }
}

/** Organizations and landmarks, shaped for the storefront. Never a bare street. */
export async function searchOrganizationLocations(query: string, city?: string): Promise<DeliveryLocationSearchResult[]> {
  if (!query || !query.trim()) return [];

  try {
    const results = await searchOrganizations(query.trim(), city);
    return results.map((result) => {
      const parts = addressPartsOf(result);
      return {
        id: idOf(result),
        kind: "organization" as const,
        label: result.display_name ?? "",
        organizationType: result.type,
        // A landmark usually has a point but no house number; both are passed so
        // the resolution rule can use whichever it has.
        street: parts.street,
        home: parts.home,
        city: parts.city ?? city,
        coordinate: coordinateOf(result),
      };
    });
  } catch (error) {
    sails.log.error("Nominatim geocoder > organization search failed", error);
    return [];
  }
}
