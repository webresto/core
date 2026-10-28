import type { AuthMethodRecord } from "../../../../models/AuthMethod";
import { hasAccess } from "./marketing-helpers";
import { AUTH_METHODS_RIGHT, Refusal, forAdmin, operatorValues } from "./auth-methods-helpers";

/** POST …/core/auth-methods/:id - the operator's fields of a row, those sent. */
export default async function UpdateAuthMethodController(req: any, res: any) {
  if (!hasAccess(req, res, AUTH_METHODS_RIGHT)) return;
  try {
    const row: AuthMethodRecord | undefined = await AuthMethod.findOne!({ id: req.params.id });
    if (!row) return res.status(404).json({ error: "The sign-in method is not found" });
    const channels = await SalesChannel.find!({});
    const values = operatorValues(req.body, row, channels.map((channel) => channel.key as string));
    // ORMModel types updateOne as the update of many
    const updated = (await AuthMethod.updateOne!({ id: row.id }).set(values)) as unknown as AuthMethodRecord;
    res.json({ method: forAdmin(updated) });
  } catch (error) {
    if (error instanceof Refusal) return res.status(400).json({ error: error.message });
    sails.log.error("Core > admin > sign-in methods:", error);
    res.status(500).json({ error: "The sign-in method is not saved" });
  }
}
