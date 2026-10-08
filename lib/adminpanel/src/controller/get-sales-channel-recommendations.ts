import { getSalesChannelPermissions, hasAccess } from "./sales-channels-helpers";
import { SalesChannelRegistry } from "../../../SalesChannelRegistry";
import { getInstalledProviderAppIds } from "../../../SalesChannelProviders";
import { mapChannelType } from "./get-sales-channel-types";

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

    const installed = await getInstalledProviderAppIds();
    const types = SalesChannelRegistry.recommendedTypesForCountry(country).map((def) => mapChannelType(def, installed, canManage));
    return res.json({ country: country || null, results: types, meta: { permissions, canManage } });
  } catch (error) {
    sails.log.error("Get sales channel recommendations error", error);
    return res.status(500).json({ error: String(error) });
  }
}
