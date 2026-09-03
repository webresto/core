import { hasManageAccess } from "./delivery-zones-helpers";

/**
 * Deletes one zone.
 *
 * This is the only place a zone is ever deleted: a sync marks zones missing and
 * leaves them, so removal is always an explicit operator decision.
 */
export default async function DeleteDeliveryZoneController(req: any, res: any) {
  try {
    if (!(await hasManageAccess(req, res))) return;

    const id = typeof req.body?.id === "string" ? req.body.id.trim() : "";
    if (!id) return res.status(400).json({ error: "Zone id is required" });

    const destroyed = await DeliveryZone.destroy({ id }).fetch();
    if (!destroyed.length) return res.status(404).json({ error: "Zone not found" });

    return res.json({ ok: true });
  } catch (error) {
    sails.log.error("Delete delivery zone error", error);
    return res.status(500).json({ error: String(error) });
  }
}
