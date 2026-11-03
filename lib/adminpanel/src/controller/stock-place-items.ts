import { hasStockManagerPlaceAccess } from "./access-rights";

/**
 * The request-shaped part of the web Stock Manager: which point this request is about, and the
 * panel's own refusal when it is not granted. The data itself is `lib/menu/stock-items` (plan C4).
 */

export function readPlaceId(req: any): string | null {
  const value = req.method === "GET" ? req.query?.placeId : req.body?.placeId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Answers with JSON rather than `sendStatus`, which sends `text/plain`.
 *
 * Access to a point can be revoked while the page is open, so this is a normal
 * runtime answer the client has to act on, not a dead end: it needs a body it
 * can parse and a stable code to branch on.
 */
export async function requireStockPlaceAccess(req: any, res: any): Promise<string | null> {
  const placeId = readPlaceId(req);
  if (!placeId || !(await hasStockManagerPlaceAccess(req, placeId))) {
    const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
    res.status(403).json({
      error: t('Access to this cooking point is not granted'),
      code: 'STOCK_PLACE_FORBIDDEN',
    });
    return null;
  }
  return placeId;
}
