import { SetupChecklistService } from "../../../../libs/SetupChecklistService";
import { buildCheckupContext, hasChecklistAccess } from "./setup-checklist-context";

/**
 * GET /core/setup-checklist/status
 * Full setup checklist status, evaluated LIVE on every request (no caching). Returns groups,
 * per-item statuses (localized), severity counts and weighted progress.
 */
export default async function GetSetupChecklistStatusController(req: any, res: any) {
  try {
    if (!hasChecklistAccess(req, res)) return;
    const ctx = buildCheckupContext(req);
    const status = await SetupChecklistService.getStatus(ctx);
    return res.json(status);
  } catch (error) {
    sails.log.error("Get setup checklist status error", error);
    return res.status(500).json({ error: String(error) });
  }
}
