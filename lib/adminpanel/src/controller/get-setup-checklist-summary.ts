import { SetupChecklistService } from "../../../../libs/SetupChecklistService";
import { buildCheckupContext, hasChecklistAccess } from "./setup-checklist-context";

/**
 * GET /core/setup-checklist/summary
 * Lightweight aggregate (counts, overallReady, progressPercent) for the global banner.
 * Same live run as /status but without the per-item arrays, to keep per-page traffic small.
 */
export default async function GetSetupChecklistSummaryController(req: any, res: any) {
  try {
    if (!hasChecklistAccess(req, res)) return;
    const ctx = buildCheckupContext(req);
    const summary = await SetupChecklistService.getSummary(ctx);
    return res.json(summary);
  } catch (error) {
    sails.log.error("Get setup checklist summary error", error);
    return res.status(500).json({ error: String(error) });
  }
}
