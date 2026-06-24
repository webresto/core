import { hasAccess } from "./sales-channels-helpers";
import { SalesChannelRegistry } from "../../../../libs/SalesChannelRegistry";

/**
 * GET …/core/sales-channels/types
 * Channel-type catalog from SalesChannelRegistry, each enriched with a best-effort
 * `installed` flag derived from the Module model (if the app-manager hook is present).
 */
export default async function GetSalesChannelTypesController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    // Best-effort: map of installed/enabled module appIds. Module is provided by the
    // app-manager hook and may be absent in minimal installs — never fail on it.
    const installedAppIds = new Set<string>();
    try {
      const ModuleModel: any = (sails as any).models?.module;
      if (ModuleModel?.find) {
        const modules = await ModuleModel.find({});
        for (const m of modules as any[]) {
          if (m?.appId) installedAppIds.add(String(m.appId));
        }
      }
    } catch (e) {
      sails.log.debug("Sales channel types: module lookup skipped", e);
    }

    const types = SalesChannelRegistry.listTypes().map((def) => ({
      ...def,
      installed: def.providerModule ? installedAppIds.has(def.providerModule) : true,
    }));

    return res.json({ results: types });
  } catch (error) {
    sails.log.error("Get sales channel types error", error);
    return res.status(500).json({ error: String(error) });
  }
}
