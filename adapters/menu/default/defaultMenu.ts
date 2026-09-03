import { getDefaultCookingPlaceId, toPlaceId } from "../../../lib/cooking-place";
import { resolveCookingPlaceForCoordinate } from "../../../lib/kitchen-resolver";
import MenuAdapter from "../MenuAdapter";
import { MenuContext, MenuRequest } from "../contracts";

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

  public async resolveContext(request: MenuRequest): Promise<MenuContext> {
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

    const assigned = toPlaceId(request?.order?.cookingPoint);
    if (assigned) {
      return {
        placeIds: [assigned],
        source: "order",
        placeRequired: false,
        diagnostics: [`menu read at the order's kitchen ${assigned}`],
      };
    }

    // The customer's coordinate, resolved exactly the way an order's kitchen is:
    // through the configured `KITCHEN_RESOLVE_CHAIN` of strategies. Asked of the
    // resolver rather than reimplemented here, because the menu shown before an
    // order and the kitchen chosen for it have to agree.
    const fromCoordinate = await resolveCookingPlaceForCoordinate(request?.coordinate);
    if (fromCoordinate) {
      return {
        placeIds: [fromCoordinate.placeId],
        source: "coordinate",
        placeRequired: false,
        diagnostics: fromCoordinate.diagnostics,
      };
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
