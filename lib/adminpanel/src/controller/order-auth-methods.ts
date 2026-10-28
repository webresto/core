import type { AuthMethodRecord } from "../../../../models/AuthMethod";
import { hasAccess } from "./marketing-helpers";
import { AUTH_METHODS_RIGHT, forAdmin } from "./auth-methods-helpers";

/** POST …/core/auth-methods/order `{ ids }` - the rows in this order: sortOrder 10, 20, … */
export default async function OrderAuthMethodsController(req: any, res: any) {
  if (!hasAccess(req, res, AUTH_METHODS_RIGHT)) return;
  try {
    const ids: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    for (const [index, id] of ids.entries()) {
      if (typeof id === "string") await AuthMethod.updateOne!({ id }).set({ sortOrder: (index + 1) * 10 });
    }
    const rows: AuthMethodRecord[] = await AuthMethod.find!({}).sort("sortOrder ASC");
    res.json({ methods: rows.map(forAdmin) });
  } catch (error) {
    sails.log.error("Core > admin > sign-in methods:", error);
    res.status(500).json({ error: "The sign-in method is not saved" });
  }
}
