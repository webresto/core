import { KML_SOURCE_NAME } from "../../../../adapters/delivery/default/kml";
import { DeliveryZoneSyncService } from "../../../../adapters/delivery/default/zone-sync";
import { hasAccess } from "./delivery-zones-helpers";

/**
 * The two things an operator sets about a zone source: the map link and how
 * often it is re-read.
 *
 * They live in two different places and the popup shows them side by side. The
 * link belongs to the source module's configuration (`DELIVERY_ZONE_SYNC_CONFIG`,
 * one entry per city), the interval is a core setting
 * (`DELIVERY_ZONE_SYNC_INTERVAL_SECONDS`) and is installation-wide because the
 * schedule is one timer.
 *
 * Third: where a zone's stable id comes from. This was left out at first, on the
 * grounds that it depends on how the map was made rather than on anything an
 * operator knows. That was wrong in the only direction that matters — a Google
 * My Maps export carries neither a placemark id nor ExtendedData, so every link
 * of the kind this feature exists for fails the whole import until somebody
 * answers this. It is asked where the link is pasted, because the link is the
 * answer: a My Maps document has nothing but names.
 *
 * `extendedDataField` still is not exposed — it only matters once the answer is
 * ExtendedData, and then the field name comes from whoever built the map.
 * `timeoutMs` is technical and `updateDescriptions` is a product decision taken
 * once. Those three keep their defaults.
 */

/** The per-city slice of the module configuration the popup may write. */
interface CitySource {
  city: string;
  url: string;
  externalIdSource: string;
}

/**
 * What this city's zones are identified by.
 *
 * A city entry overrides the shared key, which is how `syncTargets` merges them,
 * so the popup has to look in both places or it would show the shared value for
 * a city that has its own.
 */
function idSourceOf(entry: Record<string, any>, config: Record<string, any>): string {
  const own = typeof entry?.externalIdSource === "string" ? entry.externalIdSource : "";
  const shared = typeof config?.externalIdSource === "string" ? config.externalIdSource : "";
  return own || shared || "";
}

function readCities(config: Record<string, any>): CitySource[] {
  const cities = config?.cities;
  if (!Array.isArray(cities)) {
    // A flat `{url}` configuration is what a half-filled one looks like. It is
    // reported as belonging to no city so the popup can show it rather than
    // silently ignoring a link somebody typed.
    const url = typeof config?.url === "string" ? config.url : "";
    return url ? [{ city: "", url, externalIdSource: idSourceOf(config, config) }] : [];
  }

  return cities
    .filter((entry: any) => entry && typeof entry === "object" && typeof entry.city === "string")
    .map((entry: any) => ({
      city: String(entry.city),
      url: typeof entry.url === "string" ? entry.url : "",
      externalIdSource: idSourceOf(entry, config),
    }));
}

export default async function GetDeliveryZoneSourceController(
  req: any,
  res: any,
  // What the save that called this one managed to do. The popup shows it; a
  // plain GET has nothing to report and leaves it out.
  run?: { ok: boolean; text: string },
) {
  try {
    if (!(await hasAccess(req, res))) return;

    const config = ((await Settings.get("DELIVERY_ZONE_SYNC_CONFIG")) ?? {}) as Record<string, any>;

    return res.json({
      cities: readCities(config),
      intervalSeconds: await DeliveryZoneSyncService.intervalSeconds(),
      enabled: (await Settings.get("DELIVERY_ZONE_SYNC_ENABLED")) === true,
      // What the links are read as, so the popup can name the format it expects.
      source: KML_SOURCE_NAME,
      ...(run ? { run } : {}),
    });
  } catch (error) {
    sails.log.error("Get delivery zone source settings error", error);
    return res.status(500).json({ error: String(error) });
  }
}
