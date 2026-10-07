import { hasManageAccess, sendRefusal } from "./sales-channels-helpers";
import { checkCanDelete, getInstalledProviderAppIds } from "../../../../libs/SalesChannelProviders";

/**
 * POST …/core/sales-channel-delete   Body: { id }
 * Hard-deletes a channel (there is no soft-delete column). Operator-created channels can be
 * deleted any time; a provider's channel only once its module is uninstalled — while the
 * provider is installed it can only be disabled (409). The provider's onChannelDeleted()
 * cleans up its side first. Existing orders keep their orderedOnPlatform string for reports.
 */
export default async function DeleteSalesChannelController(req: any, res: any) {
  try {
    if (!hasManageAccess(req, res)) return;

    const body = req.body || {};
    const id = String(body.id || "").trim();
    if (!id) return res.status(400).json({ error: "id is required" });

    const existing = await SalesChannel.findOne({ id });
    if (!existing) return res.status(404).json({ error: "Sales channel not found" });

    const refusal = checkCanDelete(existing, await getInstalledProviderAppIds());
    if (refusal) return sendRefusal(req, res, refusal);

    await SalesChannel.destroyChannel(existing);
    return res.json({ success: true, id });
  } catch (error) {
    sails.log.error("Delete sales channel error", error);
    return res.status(500).json({ error: String(error) });
  }
}
