import type { AuthMethodRecord } from "../../../../models/AuthMethod";
import { hasAccess } from "./marketing-helpers";
import { AUTH_METHODS_RIGHT, forAdmin } from "./auth-methods-helpers";

/** GET …/core/auth-methods - the rows by their order, without secrets, and the sales channels a row may be narrowed to. */
export default async function GetAuthMethodsController(req: any, res: any) {
  if (!hasAccess(req, res, AUTH_METHODS_RIGHT)) return;
  try {
    const rows: AuthMethodRecord[] = await AuthMethod.find!({}).sort("sortOrder ASC");
    const channels = await SalesChannel.find!({}).sort("title ASC");
    res.json({ methods: rows.map(forAdmin), salesChannels: channels.map(({ key, title }) => ({ key, title })) });
  } catch (error) {
    sails.log.error("Core > admin > sign-in methods:", error);
    res.status(500).json({ error: "The sign-in methods are not loaded" });
  }
}
