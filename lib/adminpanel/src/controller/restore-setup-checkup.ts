import { SetupChecklistService } from "../../../../libs/SetupChecklistService";
import { hasChecklistAccess } from "./setup-checklist-context";

/**
 * POST /core/setup-checklist/restore   { key: string }
 * Restore a previously dismissed/snoozed checkup so it counts toward progress again.
 */
export default async function RestoreSetupCheckupController(req: any, res: any) {
  try {
    if (!hasChecklistAccess(req, res)) return;

    const key = String(req.body?.key || "").trim();
    if (!key) return res.status(400).json({ success: false, error: "key is required" });

    await SetupChecklistService.restore(key);
    return res.json({ success: true });
  } catch (error) {
    sails.log.error("Restore setup checkup error", error);
    return res.status(500).json({ error: String(error) });
  }
}
