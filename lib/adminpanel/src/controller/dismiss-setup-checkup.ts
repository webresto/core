import { SetupChecklistService } from "../../../../libs/SetupChecklistService";
import { hasChecklistAccess } from "./setup-checklist-context";

/**
 * POST /core/setup-checklist/dismiss   { key: string, snoozeDays?: number }
 * Hide or snooze a non-required checkup. Required items can never be dismissed.
 * Writes the only persisted piece of the feature (Settings["SETUP_CHECKLIST_DISMISSED"]).
 */
export default async function DismissSetupCheckupController(req: any, res: any) {
  try {
    if (!hasChecklistAccess(req, res)) return;

    const key = String(req.body?.key || "").trim();
    if (!key) return res.status(400).json({ success: false, error: "key is required" });

    const rawSnooze = Number(req.body?.snoozeDays);
    const snoozeDays = Number.isFinite(rawSnooze) && rawSnooze > 0 ? Math.floor(rawSnooze) : undefined;

    const ok = await SetupChecklistService.dismiss(key, { snoozeDays });
    if (!ok) {
      return res.status(400).json({ success: false, error: "Checkup not found or cannot be dismissed" });
    }
    return res.json({ success: true });
  } catch (error) {
    sails.log.error("Dismiss setup checkup error", error);
    return res.status(500).json({ error: String(error) });
  }
}
