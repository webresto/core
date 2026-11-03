import { requireOrderKanbanAccess } from "./access-rights";
import { kanbanPlaceList, kanbanPlacesOf } from "./order-kanban-places";

/** The points of the switch at the top of the orders board, as `/core/stock-places` does for stock. */
export default async function GetOrderKanbanPlacesController(req: any, res: any) {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    if (!(await requireOrderKanbanAccess(req, res))) return;

    const places = await kanbanPlacesOf(req, res);
    if (places === false) return;
    const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
    return res.json({ results: (await kanbanPlaceList(places)).map((place) => ({ ...place, title: t(place.title) })) });
  } catch (error) {
    sails.log.error("Get order kanban places error", error);
    return res.status(500).json({ error: String(error) });
  }
}
