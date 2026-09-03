import { getDefaultCookingPlaceId, toPlaceId } from "../../../lib/cooking-place";
import MenuAdapter from "../MenuAdapter";
import { MenuContext, MenuRequest } from "../contracts";

/**
 * One kitchen cooks the order, and the menu is that kitchen's menu.
 *
 * The difference from the default adapter is not the filtering — both narrow a
 * list to what one point can sell — but what happens when there is no point.
 * Here that is a refusal: `placeRequired` is true, and a caller that cannot name
 * a kitchen gets `MENU_PLACE_REQUIRED` instead of a global menu. Falling back
 * quietly would show a customer products the kitchen serving their address does
 * not have, which is the whole thing this mode exists to prevent.
 *
 * The installation default is still the last resort, and deliberately so. On a
 * single-kitchen installation it is the right answer, and it is the answer a
 * basket gets before an address has been entered — the kitchen resolver has
 * nothing to work with until then, and refusing the menu at that moment would
 * mean an empty storefront on first load.
 */
export class SingleKitchenMenuAdapter extends MenuAdapter {
  public readonly name = "single-place";

  public async resolveContext(request: MenuRequest): Promise<MenuContext> {
    const requested = toPlaceId(request?.cookingPointId);
    if (requested) {
      return {
        placeIds: [requested],
        source: "requested",
        placeRequired: true,
        diagnostics: [`menu read at the requested point ${requested}`],
      };
    }

    const assigned = toPlaceId(request?.order?.cookingPoint);
    if (assigned) {
      return {
        placeIds: [assigned],
        source: "order",
        placeRequired: true,
        diagnostics: [`menu read at the order's kitchen ${assigned}`],
      };
    }

    const fallback = await getDefaultCookingPlaceId();
    if (fallback) {
      return {
        placeIds: [fallback],
        source: "default",
        placeRequired: true,
        diagnostics: [
          "no kitchen on the order yet, falling back to the installation default " +
            `point ${fallback}`,
        ],
      };
    }

    // No order kitchen, no default, nothing requested. On this mode that is a
    // refusal and not unlimited stock: "we do not know which kitchen" must not
    // read as "every kitchen has everything".
    return {
      placeIds: [],
      source: "none",
      placeRequired: true,
      code: "MENU_PLACE_REQUIRED",
      diagnostics: [
        "single-place menu needs a cooking point: none requested, none on the order, " +
          "and no DEFAULT_COOKING_PLACE resolved",
      ],
    };
  }
}
