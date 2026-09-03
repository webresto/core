import { DeliveryZoneSyncService, isSkipped, MIN_INTERVAL_SECONDS } from "../../../../adapters/delivery/default/zone-sync";
import { hasManageAccess } from "./delivery-zones-helpers";
import GetDeliveryZoneSourceController from "./get-delivery-zone-source";

/** The ways a KML can name a zone so the next run recognises it again. */
const ID_SOURCES = ["name", "extended-data", "placemark-id"];
const DEFAULT_ID_SOURCE = "name";


/**
 * Writes one city's link, and optionally the shared interval.
 *
 * One city per request rather than the whole list: the popup is opened from one
 * city's gear, and sending the list back would let a stale tab overwrite a link
 * somebody else changed in another city.
 */
/**
 * What the popup says about the run it just triggered.
 *
 * Counts rather than a diff: the page behind the popup shows the zones, so the
 * question here is only "did it read the map, and did anything come of it".
 */
function summarize(outcome: any): { ok: boolean; text: string } {
  if (isSkipped(outcome)) {
    const why: Record<string, string> = {
      "sync-disabled": "synchronisation is off",
      "no-zone-source": "no module provides zones",
      "zone-source-conflict": "more than one module offers zones",
      "already-running": "a run was already in flight",
    };
    return { ok: true, text: `Saved. Not synchronised: ${why[outcome.reason] ?? outcome.reason}` };
  }

  if (outcome.errors?.length) {
    return { ok: false, text: `Saved, but the run failed: ${outcome.errors.join("; ")}` };
  }

  const { created, updated, unchanged, missing } = outcome.stats;
  return {
    ok: true,
    text: `Saved and synchronised: ${created} new, ${updated} updated, ${unchanged} unchanged` +
      (missing ? `, ${missing} no longer in the source` : ""),
  };
}

export default async function SetDeliveryZoneSourceController(req: any, res: any) {
  try {
    if (!(await hasManageAccess(req, res))) return;

    const city = typeof req.body?.city === "string" ? req.body.city.trim() : "";
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    const externalIdSource = typeof req.body?.externalIdSource === "string" ? req.body.externalIdSource.trim() : "";

    if (!city) return res.status(400).json({ error: "city is required" });

    if (externalIdSource && !ID_SOURCES.includes(externalIdSource)) {
      return res.status(400).json({ error: `externalIdSource must be one of ${ID_SOURCES.join(", ")}` });
    }

    const config = ((await Settings.get("DELIVERY_ZONE_SYNC_CONFIG")) ?? {}) as Record<string, any>;
    const { cities: existing, ...shared } = config;

    const list = Array.isArray(existing) ? [...existing] : [];
    const index = list.findIndex((entry: any) => entry && entry.city === city);

    if (url) {
      // A new link gets "name" unless asked otherwise. The alternatives read an
      // id out of the document, and the documents this is pointed at — Google My
      // Maps exports — do not have one, so any other default is a first run that
      // imports nothing. The cost is stated in the popup: rename a zone in the
      // map and it arrives as a new one.
      const idSource = externalIdSource || (index >= 0 ? list[index].externalIdSource : "") || DEFAULT_ID_SOURCE;
      if (index >= 0) list[index] = { ...list[index], city, url, externalIdSource: idSource };
      else list.push({ city, url, externalIdSource: idSource });
    } else if (index >= 0) {
      // An emptied link means "this city has no source", which is a city with no
      // entry — leaving `{city, url: ""}` behind would fail the target check on
      // the next run instead.
      list.splice(index, 1);
    }

    await Settings.set("DELIVERY_ZONE_SYNC_CONFIG", {
      key: "DELIVERY_ZONE_SYNC_CONFIG",
      value: { ...shared, ...(list.length ? { cities: list } : {}) },
    } as any);

    if (req.body?.intervalSeconds !== undefined) {
      const seconds = Number(req.body.intervalSeconds);
      if (!Number.isFinite(seconds)) {
        return res.status(400).json({ error: "intervalSeconds must be a number" });
      }
      // Too small is raised rather than refused. The schedule already floors it
      // at five minutes when it reads the setting, and refusing meant a zero
      // typed into the interval field threw away the link typed above it.
      await Settings.set("DELIVERY_ZONE_SYNC_INTERVAL_SECONDS", {
        key: "DELIVERY_ZONE_SYNC_INTERVAL_SECONDS",
        value: Math.max(seconds, MIN_INTERVAL_SECONDS),
      } as any);
    }

    // "Off" is what an operator reaches for when a link is wrong, so it belongs
    // beside the link and not three pages away in the settings list.
    if (typeof req.body?.enabled === "boolean") {
      await Settings.set("DELIVERY_ZONE_SYNC_ENABLED", {
        key: "DELIVERY_ZONE_SYNC_ENABLED",
        value: req.body.enabled,
      } as any);
    }

    // The schedule reads both of these at start, so it is restarted rather than
    // left running with the previous link and interval until the next tick.
    await DeliveryZoneSyncService.start();

    // And then read the map once, now. Saving a link is the operator saying
    // "use this", and waiting out an interval to find out whether it works —
    // with no zones on the page and nothing said — is indistinguishable from a
    // link that was silently ignored. The run covers every configured city,
    // because that is the unit a run has.
    const outcome = await DeliveryZoneSyncService.run({ reason: "settings-change" });

    return GetDeliveryZoneSourceController(req, res, summarize(outcome));
  } catch (error) {
    sails.log.error("Set delivery zone source settings error", error);
    return res.status(500).json({ error: String(error) });
  }
}
