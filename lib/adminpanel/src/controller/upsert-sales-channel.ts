import { hasManageAccess, mapChannel, sendRefusal } from "./sales-channels-helpers";
import { applyChannel } from "../../../sales-channels/apply";

/**
 * POST …/core/sales-channel   (create or update an instance)
 * Body: { id?, key?, title, type, enabled?, countries[], platforms[], concepts[],
 *         defaultConcept?, allowConceptSwitch?, url?, settings?, publicConfig?, sortOrder? }
 *
 * `key` identifies a backend client/integration. It must not be confused with frontend
 * runtime platform values such as "web", "pwa-ios", "pwa-android", "ios", or "android".
 *
 * Every rule of the write — the uniqueness of `key`, the slug, "the type never changes", which
 * fields are taken from the body, "a new channel starts disabled" — is `applyChannel`
 * (lib/sales-channels/apply.ts), the same function the MCP tool and the mobile API call:
 *  - create only for an available type whose provider is alive, respecting
 *    supportsMultipleInstances; the channel starts disabled, needs_setup, managedBy "operator";
 *  - `type`, `providerModule`, `managedBy` and `status` are never taken from the body;
 *  - switching on needs the provider to report `ready` (409 "Finish setup first");
 *  - a platform may belong to one channel only.
 */
export default async function UpsertSalesChannelController(req: any, res: any) {
  try {
    if (!hasManageAccess(req, res)) return;

    const outcome = await applyChannel(req.body || {});
    if (!outcome.ok) return sendRefusal(req, res, outcome.refusal);

    const { saved, computed, installed } = outcome;
    return res.json({ success: true, result: mapChannel(saved, { canManage: true, installed, computed, req }) });
  } catch (error) {
    sails.log.error("Upsert sales channel error", error);
    return res.status(500).json({ error: String(error) });
  }
}
