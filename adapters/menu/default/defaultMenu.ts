import { getDefaultCookingPlaceId, primaryCookingPoint, toPlaceId } from "../../../lib/menu/cooking-place";
import MenuAdapter from "../MenuAdapter";
import { MenuContext, MenuRequest } from "../../../interfaces/Menu";

/**
 * The menu every installation had before this iteration.
 *
 * It adds no place-based restriction: one global menu, read at the installation's
 * default cooking point. That last part is not new and is not a filter by kitchen
 * — stock has been read at `DEFAULT_COOKING_PLACE` since the second iteration,
 * and dropping it here would put every stopped product back on the storefront.
 *
 * A point is never required, so nothing about the ordering flow changes: no
 * address, no chosen kitchen, no new screen before the first product goes into a
 * basket.
 */
export class DefaultMenuAdapter extends MenuAdapter {
  public readonly name = "default";

  protected async resolvePlaces(request: MenuRequest): Promise<Omit<MenuContext, "order">> {
    // An explicitly named point is still honoured. The mode says the menu is not
    // *tied* to a point, not that a caller may not ask about one — the operator
    // screens ask exactly that question about an order they are looking at.
    const requested = toPlaceId(request?.cookingPointId);
    if (requested) {
      return {
        placeIds: [requested],
        source: "requested",
        placeRequired: false,
        diagnostics: [`menu read at the requested point ${requested}`],
      };
    }

    const assigned = primaryCookingPoint(request?.order);
    if (assigned) {
      return {
        placeIds: [assigned],
        source: "order",
        placeRequired: false,
        diagnostics: [`menu read at the order's kitchen ${assigned}`],
      };
    }

    // The customer's coordinate, resolved exactly the way an order's kitchen is:
    // through `resolveCookingPlace` and its `KITCHEN_RESOLVE_CHAIN`, because the
    // menu shown before an order and the kitchen chosen for it have to agree.
    // Nothing chosen falls through to the installation default, which is what a
    // customer who has typed no address has always been shown.
    if (request?.coordinate) {
      const resolution = await this.resolveCookingPlace({ coordinate: request.coordinate });
      if (resolution.placeId) {
        return {
          placeIds: [resolution.placeId],
          source: "coordinate",
          placeRequired: false,
          diagnostics: resolution.diagnostics,
        };
      }
    }

    const fallback = await getDefaultCookingPlaceId();
    return {
      placeIds: fallback ? [fallback] : [],
      source: fallback ? "default" : "none",
      placeRequired: false,
      diagnostics: [
        fallback
          ? `menu read at the installation default point ${fallback}`
          : "no cooking point configured, stock is unlimited",
      ],
    };
  }
}
