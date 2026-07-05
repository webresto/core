import { hasManageAccess, mapChannel } from "./sales-channels-helpers";

/**
 * POST …/core/sales-channel-toggle   Body: { id, enabled }
 * Enable/disable a channel and keep `status` consistent (ready ⇄ disabled), without
 * clobbering a non-ready state like needs_setup/error when re-enabling.
 */
export default async function ToggleSalesChannelController(req: any, res: any) {
  try {
    if (!hasManageAccess(req, res)) return;

    const body = req.body || {};
    const id = String(body.id || "").trim();
    if (!id) return res.status(400).json({ error: "id is required" });

    const existing = await SalesChannel.findOne({ id });
    if (!existing) return res.status(404).json({ error: "Sales channel not found" });

    const enabled = Boolean(body.enabled);
    let status = existing.status;
    if (enabled) {
      if (status === "disabled" || status === "draft") status = "ready";
    } else {
      status = "disabled";
    }

    const saved = (await SalesChannel.update({ id }, { enabled, status }).fetch())[0];
    return res.json({ success: true, result: mapChannel(saved, { canManage: true }) });
  } catch (error) {
    sails.log.error("Toggle sales channel error", error);
    return res.status(500).json({ error: String(error) });
  }
}
