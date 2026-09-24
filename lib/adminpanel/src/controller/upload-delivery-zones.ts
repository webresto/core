import { parseKml } from "../../../../adapters/delivery/default/kml";
import { parseGeoJson } from "../../../../adapters/delivery/default/geojson";
import { importLocalZones } from "../../../../adapters/delivery/default/zone-import";
import { hasManageAccess, readZoneTerms } from "./delivery-zones-helpers";

/**
 * A drawn map, uploaded once, as local zones of the city on screen.
 *
 * The file arrives as text: the browser reads it, so there is no multipart body
 * to parse and no temporary file to clean up. Which format it is is answered by
 * the content and not by the extension — `.json` is what a GeoJSON export is
 * called about as often as `.geojson`.
 *
 * KML placemarks are keyed by name here, which is exactly the choice the
 * synchronisation refuses to make on its own. It costs nothing: the zones this
 * creates carry no source, so there is no next run to match them against.
 */
export default async function UploadDeliveryZonesController(req: any, res: any) {
  try {
    if (!(await hasManageAccess(req, res))) return;

    const content = typeof req.body?.content === "string" ? req.body.content : "";
    if (!content.trim()) return res.status(400).json({ error: "The file is empty" });

    const city = typeof req.body?.city === "string" && req.body.city.trim() ? req.body.city.trim() : null;

    // Every zone out of a file prices itself — a file carries no layers — and
    // the model refuses one without a time and a cost.
    const terms = readZoneTerms(req.body);
    if (!terms) return res.status(400).json({ error: "Delivery time and delivery cost are required" });

    const zones = content.includes("<kml")
      ? (await parseKml(content, { externalIdSource: "name" })).map((zone) => ({ name: zone.name, polygon: zone.polygon }))
      : parseGeoJson(content);

    return res.json(await importLocalZones({ city, zones, terms }));
  } catch (error) {
    // A file that is not a map, a placemark without a name, a polygon that
    // cannot enclose an area — all of it is worth showing as written.
    sails.log.error("Upload delivery zones error", error);
    return res.status(400).json({ error: (error as any)?.message ?? String(error) });
  }
}
