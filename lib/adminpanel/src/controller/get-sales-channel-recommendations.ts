import { getSalesChannelPermissions, hasAccess } from "./sales-channels-helpers";
import { SalesChannelRegistry } from "../../../../libs/SalesChannelRegistry";

async function getInstalledAppIds(): Promise<Set<string>> {
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
    sails.log.debug("Sales channel recommendations: module lookup skipped", e);
  }
  return installedAppIds;
}

/**
 * GET …/core/sales-channels/recommendations
 * Recommended channel types for the project's country (Settings COUNTRY_ISO), resolved
 * against the registry. Query `country` overrides the setting (for previewing other markets).
 * Recommendations are discovery hints, never a hard rule (doc §5).
 */
export default async function GetSalesChannelRecommendationsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;
    const permissions = getSalesChannelPermissions(req);
    const canManage = permissions.canManage;

    const override = String(req.query.country || "").trim();
    let country = override;
    if (!country) {
      try {
        const value = await Settings.get("COUNTRY_ISO");
        country = value ? String(value).trim() : "";
      } catch { /* ignore */ }
    }

    const installedAppIds = await getInstalledAppIds();
    const types = SalesChannelRegistry.recommendedTypesForCountry(country).map((def) => ({
      ...def,
      settingsUrl: canManage ? def.settingsUrl : null,
      providerModule: canManage ? def.providerModule : null,
      installed: def.providerModule ? installedAppIds.has(def.providerModule) : true,
    }));
    return res.json({ country: country || null, results: types, meta: { permissions, canManage } });
  } catch (error) {
    sails.log.error("Get sales channel recommendations error", error);
    return res.status(500).json({ error: String(error) });
  }
}
