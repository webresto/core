import { getDefaultCookingPlaceId, namedMenuPoint } from "../../../lib/menu/cooking-place";
import { getMenuPlaceBasedMode } from "../../../lib/menu/product-availability";
import MenuAdapter from "../MenuAdapter";
import { MenuContext, MenuRequest } from "../../../interfaces/Menu";

/**
 * The menu core ships, in the two modes `MENU_PLACE_BASED_MODE` names for it.
 *
 * **`default`** adds no place-based restriction: one global menu, read at the
 * kitchen the customer's coordinate resolves to or at the installation's
 * default cooking point. That last part is not a filter by kitchen — stock has
 * been read at `DEFAULT_COOKING_PLACE` since the second iteration, and dropping
 * it would put every stopped product back on the storefront. A point is never
 * required, so no address and no chosen kitchen stands before the first product
 * goes into a basket.
 *
 * **`single-place`** — one kitchen cooks the order, and the menu is that
 * kitchen's menu. The difference is what happens when there is no point: a
 * refusal, `MENU_PLACE_REQUIRED`, instead of a global menu. Falling back quietly
 * would show a customer products the kitchen serving their address does not
 * have, which is the whole thing this mode exists to prevent. The installation
 * default is still the last resort, and deliberately so: it is the answer a
 * basket gets before an address has been entered, and refusing the menu then
 * would mean an empty storefront on first load.
 */
export class DefaultMenuAdapter extends MenuAdapter {
  protected async resolvePlaces(request: MenuRequest): Promise<Omit<MenuContext, "order">> {
    const placeRequired = (await getMenuPlaceBasedMode()) === "single-place";

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
      const resolution = await this.resolveCookingPlace({ coordinate: request.coordinate });
      if (resolution.placeId) {
        return {
          placeIds: [resolution.placeId],
          source: "coordinate",
          placeRequired,
          diagnostics: resolution.diagnostics,
        };
      }
    }

    const fallback = await getDefaultCookingPlaceId();
    if (fallback) {
      return {
        placeIds: [fallback],
        source: "default",
        placeRequired,
        diagnostics: [`menu read at the installation default point ${fallback}`],
      };
    }

    // "We do not know which kitchen" must not read as "every kitchen has
    // everything" where the mode asks for a kitchen.
    if (placeRequired) {
      return {
        placeIds: [],
        source: "none",
        placeRequired,
        code: "MENU_PLACE_REQUIRED",
        diagnostics: [
          "single-place menu needs a cooking point: none requested, none on the order, " +
            "and no DEFAULT_COOKING_PLACE resolved",
        ],
      };
    }

    return {
      placeIds: [],
      source: "none",
      placeRequired,
      diagnostics: ["no cooking point configured, stock is unlimited"],
    };
  }
}
