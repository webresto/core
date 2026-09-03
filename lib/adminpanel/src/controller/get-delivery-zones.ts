import { DeliveryZoneRecord } from "../../../../models/DeliveryZone";
import { getZoneOwnership } from "../../../../adapters/delivery/default/zone-ownership";
import { hasAccess, toZoneView } from "./delivery-zones-helpers";

/** Zones plus the kitchens they can be bound to. */
export default async function GetDeliveryZonesController(req: any, res: any) {
  try {
    if (!(await hasAccess(req, res))) return;

    const zones = (await DeliveryZone.find({ sort: "sortOrder ASC" })) as DeliveryZoneRecord[];
    const places = await Place.find({ where: { isCookingPoint: true }, sort: "title ASC" });
    const cities = await City.find({ where: { isDeleted: { "!=": true } }, sort: "name ASC" });
    const ownership = await getZoneOwnership();

    return res.json({
      // Where each city's geometry is edited instead, when it has a source. A
      // city missing from the map draws its zones by hand.
      ownership: { sourceUrls: ownership.sourceUrls },
      // Sent with the zones rather than the page so an installation can move to
      // its own tile server without a restart.
      map: {
        tileUrl: (await Settings.get("DELIVERY_ZONE_MAP_TILE_URL")) || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: (await Settings.get("DELIVERY_ZONE_MAP_ATTRIBUTION")) || "© OpenStreetMap contributors",
      },
      zones: zones.map((zone) => toZoneView(zone, ownership)),
      // Empty on a single-city installation, and the editor then hides the field
      // entirely rather than showing a select with nothing in it.
      cities: cities.map((city: any) => ({ id: String(city.id), name: city.name || String(city.id) })),
      places: places.map((place: any) => ({
        id: String(place.id),
        title: place.title || String(place.id),
        address: place.address || null,
        // Drawn on the map, and — when the city has no zones at all yet — also
        // what the opening view falls back to.
        coordinate: place.coordinate?.lat !== undefined && place.coordinate?.lng !== undefined
          ? { lat: place.coordinate.lat, lon: place.coordinate.lng }
          : null,
        // A disabled kitchen still shows: the binding stays valid, the zone is
        // just unserved until the point is switched back on.
        enable: place.enable !== false,
      })),
    });
  } catch (error) {
    sails.log.error("Get delivery zones error", error);
    return res.status(500).json({ error: String(error) });
  }
}
