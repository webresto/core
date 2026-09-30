import { namedMenuPoint } from "../../../lib/menu/cooking-place";
import { Adapter } from "../../index";
import MenuAdapter from "../MenuAdapter";
import { MenuContext, MenuRequest } from "../../../interfaces/Menu";

/**
 * The menu core ships, in the two modes `MENU_PLACE_BASED_MODE` names for it.
 *
 * **`default`** — the menu of the kitchen that cooks: the requested point, the
 * order's kitchen, or the one the customer's coordinate resolves to. Until
 * there is one, the kitchens the order could still end up at, and only what
 * each of them has (`unaddressedKitchens`). A point is never required, so no
 * address and no chosen kitchen stands before the first product goes into a
 * basket.
 *
 * **`single-place`** — one kitchen cooks the order, and the menu is that
 * kitchen's menu. A coordinate alone does not pick it: the menu waits for the
 * order's kitchen. Before that it is read the way `default` reads it — refusing
 * it would mean an empty storefront on first load — and with no kitchen at all
 * it is a refusal, `MENU_PLACE_REQUIRED`, instead of a global menu.
 */
export class DefaultMenuAdapter extends MenuAdapter {
  protected async resolvePlaces(request: MenuRequest): Promise<Omit<MenuContext, "order">> {
    const placeRequired = (await Adapter.nameOf("menu")) === "single-place";

    // A named point is honoured in both modes. The global mode says the menu is
    // not *tied* to a point, not that a caller may not ask about one — the
    // operator screens ask exactly that question about an order they are looking at.
    const named = namedMenuPoint(request);
    if (named) {
      return {
        placeIds: [named.placeId],
        source: named.source,
        placeRequired,
        diagnostics: [
          named.source === "requested"
            ? `menu read at the requested point ${named.placeId}`
            : `menu read at the order's kitchen ${named.placeId}`,
        ],
      };
    }

    // The customer's coordinate, resolved exactly the way an order's kitchen is:
    // through `resolveCookingPlace` and its `KITCHEN_RESOLVE_CHAIN`, because the
    // menu shown before an order and the kitchen chosen for it have to agree.
    if (!placeRequired && request?.coordinate) {
      const resolution = await this.resolveCookingPlace({
        coordinate: request.coordinate,
        city: request.order?.address?.city ?? null,
      });
      if (resolution.placeId) {
        return {
          placeIds: [resolution.placeId],
          source: "coordinate",
          placeRequired,
          diagnostics: resolution.diagnostics,
        };
      }
    }

    return this.unaddressedKitchens(request?.order, placeRequired);
  }
}
