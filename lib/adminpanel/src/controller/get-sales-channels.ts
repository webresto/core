import { getSalesChannelPermissions, hasAccess, mapChannel } from "./sales-channels-helpers";

/**
 * GET …/core/sales-channels
 * Lists configured sales-channel instances.
 * Query: q (search title/key/type), enabled (on|off), type, concept.
 */
export default async function GetSalesChannelsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;
    const permissions = getSalesChannelPermissions(req);
    const canManage = permissions.canManage;

    const q = String(req.query.q || "").trim().toLowerCase();
    const enabled = String(req.query.enabled || "").trim().toLowerCase();
    const type = String(req.query.type || "").trim();
    const concept = String(req.query.concept || "").trim();

    const channels = await SalesChannel.find({}).sort("sortOrder ASC");
    const mapped = channels.map((c: any) => mapChannel(c, { canManage }));

    const filtered = mapped.filter((c: any) => {
      if (enabled === "on" && !c.enabled) return false;
      if (enabled === "off" && c.enabled) return false;
      if (type && c.type !== type) return false;
      if (concept && !(Array.isArray(c.concepts) && c.concepts.includes(concept))) return false;
      if (!q) return true;
      const haystack = [c.title, c.key, c.type, c.typeTitle].map((x: any) => String(x || "").toLowerCase()).join(" ");
      return haystack.includes(q);
    });

    return res.json({ results: filtered, meta: { total: filtered.length, permissions, canManage } });
  } catch (error) {
    sails.log.error("Get sales channels error", error);
    return res.status(500).json({ error: String(error) });
  }
}
