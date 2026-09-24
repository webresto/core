import axios from "axios";
import GeoAdapter, { GeoAddress } from "../GeoAdapter";
import { AddressPoint, formatAddressPath } from "../address";

/**
 * Nominatim as the geocoder of an installation that names no other.
 *
 * `NOMINATIM_URL` says which server; the public one when it is unset.
 */

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: Record<string, string>;
  /** Set instead of everything else when `/reverse` finds nothing. */
  error?: string;
}

const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_TIMEOUT_MS = 10000;

async function nominatimBaseUrl(): Promise<string> {
  const configured = await Settings.get("NOMINATIM_URL");
  const url = typeof configured === "string" && configured.trim() ? configured.trim() : DEFAULT_BASE_URL;
  return url.replace(/\/+$/, "");
}

async function get(path: string, params: Record<string, string | number>): Promise<unknown> {
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

  return response.data;
}

function pointOf(result: NominatimResult | undefined): AddressPoint | null {
  if (!result?.lat || !result?.lon) return null;

  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

export class NominatimGeoAdapter extends GeoAdapter {
  public async geocode(parts: { street: string; home: string; city?: string }): Promise<AddressPoint | null> {
    const query = [parts.city, parts.street, parts.home].filter(Boolean).join(", ");
    const results = await get("search", { q: query, limit: 1 });
    return Array.isArray(results) ? pointOf(results[0]) : null;
  }

  /**
   * The building at a coordinate, or the nearest thing Nominatim has.
   *
   * The city is read off the answer, not assumed: a point on a city's edge can
   * belong to the next municipality.
   */
  public async reverse(coordinate: AddressPoint): Promise<GeoAddress | null> {
    // Zoom 18 is the building level: coarser answers stop at the street and
    // carry no house number.
    const result = (await get("reverse", { lat: coordinate.lat, lon: coordinate.lon, zoom: 18 })) as NominatimResult | null;
    if (!result || result.error) return null;

    const address = result.address ?? {};
    const street = address.road ?? address.pedestrian ?? address.footway ?? undefined;
    const home = address.house_number ?? undefined;
    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? undefined;
    // "улица Ленина, 12" rather than the whole display name down to the
    // postcode and the country.
    const formatted = street ? formatAddressPath([street, home]) : result.display_name;
    if (!formatted) return null;

    return { city, street, home, formatted };
  }
}
