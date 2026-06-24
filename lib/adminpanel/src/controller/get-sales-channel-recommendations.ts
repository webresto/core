import { hasAccess } from "./sales-channels-helpers";
import { SalesChannelRegistry } from "../../../../libs/SalesChannelRegistry";

/**
 * GET …/core/sales-channels/recommendations
 * Recommended channel types for the project's country (Settings COUNTRY_ISO), resolved
 * against the registry. Query `country` overrides the setting (for previewing other markets).
 * Recommendations are discovery hints, never a hard rule (doc §5).
 */
export default async function GetSalesChannelRecommendationsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    const override = String(req.query.country || "").trim();
    let country = override;
    if (!country) {
      try {
        const value = await Settings.get("COUNTRY_ISO");
        country = value ? String(value).trim() : "";
      } catch { /* ignore */ }
    }

    const types = SalesChannelRegistry.recommendedTypesForCountry(country);
    return res.json({ country: country || null, results: types });
  } catch (error) {
    sails.log.error("Get sales channel recommendations error", error);
    return res.status(500).json({ error: String(error) });
  }
}
