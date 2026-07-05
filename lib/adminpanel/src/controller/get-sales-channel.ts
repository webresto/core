import { getSalesChannelPermissions, hasAccess, mapChannel } from "./sales-channels-helpers";

/**
 * GET …/core/sales-channel?id=…  (or ?key=…)
 * Returns a single configured sales-channel instance for the edit form.
 */
export default async function GetSalesChannelController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;
    const permissions = getSalesChannelPermissions(req);

    const id = String(req.query.id || "").trim();
    const key = String(req.query.key || "").trim();
    if (!id && !key) return res.status(400).json({ error: "id or key is required" });

    const channel = await SalesChannel.findOne(id ? { id } : { key });
    if (!channel) return res.status(404).json({ error: "Sales channel not found" });

    return res.json({ result: mapChannel(channel, { canManage: permissions.canManage }), meta: { permissions, canManage: permissions.canManage } });
  } catch (error) {
    sails.log.error("Get sales channel error", error);
    return res.status(500).json({ error: String(error) });
  }
}
