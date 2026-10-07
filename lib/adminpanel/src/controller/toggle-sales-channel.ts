import { hasManageAccess, mapChannel, sendRefusal } from "./sales-channels-helpers";
import { checkCanEnable, getInstalledProviderAppIds } from "../../../../libs/SalesChannelProviders";

/**
 * POST …/core/sales-channel-toggle   Body: { id, enabled }
 * The operator's switch only: `status` is the provider's readiness and is never written here.
 * Switching on needs a live provider that reports `ready` right now — otherwise 409
 * "Finish setup first" with the provider's settingsUrl and message (or "Install the provider
 * first"), and the channel stays off. Switching off is always allowed.
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
    const installed = await getInstalledProviderAppIds();
    let computed = null;
    if (enabled) {
      const check = await checkCanEnable(existing, installed);
      if (check.refusal) return sendRefusal(req, res, check.refusal);
      computed = check.computed;
    }

    const saved = (await SalesChannel.update({ id }, { enabled }).fetch())[0];
    // The UI puts this result straight into the card, so it carries the provider fields too.
    return res.json({ success: true, result: mapChannel(saved, { canManage: true, installed, computed, req }) });
  } catch (error) {
    sails.log.error("Toggle sales channel error", error);
    return res.status(500).json({ error: String(error) });
  }
}
