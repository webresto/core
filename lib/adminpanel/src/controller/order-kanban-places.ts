import { NO_KITCHEN, NO_KITCHEN_TITLE } from "../../order-kanban-rights";
import { getOrderKanbanPlaceRights, hasOrderKanbanPlaceAccess } from "./access-rights";

/**
 * Which points one request of the orders board works with (plan C1).
 *
 * `placeId` given — that one point, checked through the contextual token with the point as context,
 * so taking a point away from a group takes effect on the next request. No `placeId` — every point
 * the user holds: `null` for an administrator, which means "no filter at all".
 *
 * An operator whose group has the token but no points gets an empty list and therefore no orders —
 * the board opens and says so, as Stock Manager does.
 */
export type KanbanPlaces = string[] | null;

/**
 * `false` — refused, and the answer has already been sent. `asked` defaults to the `placeId` of the
 * request; pass `""` to ask for every point the user holds even when the body names one for another
 * purpose — as «Назначить кухню» does, where `placeId` is the kitchen being given.
 */
export async function kanbanPlacesOf(
  req: any,
  res: any,
  asked: string = String(req.query?.placeId ?? req.body?.placeId ?? "").trim(),
): Promise<KanbanPlaces | false> {
  if (asked) {
    if (!(await hasOrderKanbanPlaceAccess(req, asked))) {
      res.sendStatus(403);
      return false;
    }
    return [asked];
  }
  const rights = getOrderKanbanPlaceRights(req);
  return rights === null ? null : rights.map(String);
}

/** The points of the switch at the top of the board, titles included. */
export interface KanbanPlace {
  id: string;
  title: string;
  address: string | null;
  /** A kitchen can be given an order that has none; a pickup point cannot (plan C6). */
  isCookingPoint: boolean;
}

export async function kanbanPlaceList(places: KanbanPlaces): Promise<KanbanPlace[]> {
  const where: any = { enable: true, or: [{ isCookingPoint: true }, { isPickupPoint: true }] };
  if (places !== null) {
    const ids = places.filter((id) => id !== NO_KITCHEN);
    if (!ids.length) {
      return places.includes(NO_KITCHEN) ? [{ id: NO_KITCHEN, title: NO_KITCHEN_TITLE, address: null, isCookingPoint: false }] : [];
    }
    where.id = { in: ids };
  }
  const rows = await Place.find!({ where, sort: "title ASC" });
  const list: KanbanPlace[] = rows.map((place: any) => ({
    id: String(place.id),
    title: place.title || String(place.id),
    address: place.address || null,
    isCookingPoint: place.isCookingPoint === true,
  }));
  if (places === null || places.includes(NO_KITCHEN)) list.push({ id: NO_KITCHEN, title: NO_KITCHEN_TITLE, address: null, isCookingPoint: false });
  return list;
}
