import { hasManageAccess } from "./sales-channels-helpers";

/**
 * POST …/core/sales-channel-delete   Body: { id }
 * Hard-deletes a configured channel instance (instances are user-created; there is no
 * soft-delete column). Existing orders keep their orderedOnPlatform string for reports.
 */
export default async function DeleteSalesChannelController(req: any, res: any) {
  try {
    if (!hasManageAccess(req, res)) return;

    const body = req.body || {};
    const id = String(body.id || "").trim();
    if (!id) return res.status(400).json({ error: "id is required" });

    const existing = await SalesChannel.findOne({ id });
    if (!existing) return res.status(404).json({ error: "Sales channel not found" });

    await SalesChannel.destroy({ id }).fetch();
    return res.json({ success: true, id });
  } catch (error) {
    sails.log.error("Delete sales channel error", error);
    return res.status(500).json({ error: String(error) });
  }
}
