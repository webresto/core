import { getStockManagerPlaceRights, requireStockManagerAccess } from "./access-rights";

export default async function GetStockPlacesController(req: any, res: any) {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    if (!requireStockManagerAccess(req, res)) return;

    const rights = getStockManagerPlaceRights(req);
    const where: any = { isCookingPoint: true, enable: true };
    if (rights !== null) where.id = { in: rights };

    const places = await Place.find({ where, sort: "title ASC" });
    return res.json({
      results: places.map((place: any) => ({
        id: place.id,
        title: place.title || String(place.id),
        address: place.address || null,
      })),
    });
  } catch (error) {
    sails.log.error("Get stock places error", error);
    return res.status(500).json({ error: String(error) });
  }
}

