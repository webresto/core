export function hasAnyPermission(req: any, user: any, tokens: string[]): boolean {
  if (!req.adminizer?.accessRightsHelper) return true;
  return tokens.some((token) => req.adminizer.accessRightsHelper.hasPermission(token, user));
}

export type ModuleAccessLevel = "view" | "manage";

export interface ModuleAccessConfig {
  legacyToken?: string;
  viewToken: string;
  manageToken: string;
}

export interface ModulePermissions {
  canView: boolean;
  canManage: boolean;
}

function tokensForLevel(access: ModuleAccessConfig, level: ModuleAccessLevel): string[] {
  const legacyTokens = access.legacyToken ? [access.legacyToken] : [];
  if (level === "manage") return [...legacyTokens, access.manageToken];
  return [...legacyTokens, access.viewToken, access.manageToken];
}

export function hasModulePermission(req: any, access: ModuleAccessConfig, level: ModuleAccessLevel): boolean {
  return hasAnyPermission(req, req.user, tokensForLevel(access, level));
}

export function getModulePermissions(req: any, access: ModuleAccessConfig): ModulePermissions {
  return {
    canView: hasModulePermission(req, access, "view"),
    canManage: hasModulePermission(req, access, "manage"),
  };
}

export function requireModulePermission(
  req: any,
  res: any,
  access: ModuleAccessConfig,
  level: ModuleAccessLevel,
): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (!hasModulePermission(req, access, level)) {
    res.sendStatus(403);
    return false;
  }
  return true;
}

export function requireToken(req: any, res: any, token: string): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (!hasAnyPermission(req, req.user, [token])) {
    res.sendStatus(403);
    return false;
  }
  return true;
}

export const NOTIFICATIONS_ACCESS: ModuleAccessConfig = {
  legacyToken: "notifications-manager",
  viewToken: "notifications-manager-view",
  manageToken: "notifications-manager-manage",
};

export const SALES_CHANNELS_ACCESS: ModuleAccessConfig = {
  legacyToken: "sales-channels-manager",
  viewToken: "sales-channels-view",
  manageToken: "sales-channels-manage",
};

export const DELIVERY_ZONES_ACCESS: ModuleAccessConfig = {
  viewToken: "delivery-zones-view",
  manageToken: "delivery-zones-manage",
};

/**
 * Writing the address catalog of a city.
 *
 * One token and no view counterpart: reading the catalog is what the storefront
 * does on every keystroke, and the rows themselves are an ordinary Adminizer
 * model. This gates the one thing that is not ordinary — dropping a file in.
 */
export const ADDRESSES_MANAGE_TOKEN = "addresses-manage";

export const STOCK_MANAGER_TOKEN = "stock-manager";

/** A group may have the token but no selected points; that grants the page, not stock data. */
export function requireStockManagerAccess(req: any, res: any): boolean {
  return requireToken(req, res, STOCK_MANAGER_TOKEN);
}

export function getStockManagerPlaceRights(req: any): string[] | null {
  if (!req.adminizer?.accessRightsHelper) return null;
  return req.adminizer.accessRightsHelper.getPermissionRights(STOCK_MANAGER_TOKEN, req.user);
}

export async function hasStockManagerPlaceAccess(req: any, placeId: unknown): Promise<boolean> {
  if (!placeId || typeof placeId !== "string") return false;
  if (!req.adminizer?.accessRightsHelper) return true;
  // `checkPermission`, not `hasPermission`: the latter is the frozen synchronous
  // one and ignores the context entirely, so every holder of the token would be
  // granted every point.
  return Boolean(await req.adminizer.accessRightsHelper.checkPermission(STOCK_MANAGER_TOKEN, req.user, { placeId }));
}
