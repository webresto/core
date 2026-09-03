import {
  changedSourceOwnedFields,
  getZoneOwnership,
  pickOperatorFields,
  zoneIsLocked,
} from "../../../../adapters/delivery/default/zone-ownership";
import { hasManageAccess, readZoneInput, toZoneView } from "./delivery-zones-helpers";

/**
 * Creates or updates one zone from the editor.
 *
 * While a source owns a zone, this endpoint writes the operator's fields and
 * nothing else. The check lives here rather than in the model because the model
 * cannot tell an operator from the import — both write through it, and the
 * import is precisely the party that is allowed to change the geometry.
 */
export default async function UpsertDeliveryZoneController(req: any, res: any) {
  try {
    if (!(await hasManageAccess(req, res))) return;

    const { values, error } = readZoneInput(req.body);
    if (error || !values) return res.status(400).json({ error });

    const id = typeof req.body?.id === "string" && req.body.id.trim() ? req.body.id.trim() : null;

    if (id) {
      const existing = await DeliveryZone.findOne({ id });
      if (!existing) return res.status(404).json({ error: "Zone not found" });

      const ownership = await getZoneOwnership();
      const locked = zoneIsLocked(existing, ownership);

      if (locked) {
        const rejected = changedSourceOwnedFields(existing, values);
        if (rejected.length) {
          return res.status(409).json({
            error:
              `This zone is owned by the "${existing.source}" synchronisation, ` +
              `so ${rejected.join(", ")} cannot be changed here. ` +
              `Edit it in the source, or detach the zone to take it over.`,
          });
        }
      }

      const updated = await DeliveryZone.updateOne({ id }, locked ? pickOperatorFields(values) : values);
      return res.json({ zone: toZoneView(updated, ownership) });
    }

    const ownership = await getZoneOwnership();
    const created = await DeliveryZone.create(values as any).fetch();
    return res.json({ zone: toZoneView(created, ownership) });
  } catch (error) {
    // Model validation — an unusable polygon, a place that is not a kitchen, a
    // duplicated external id — arrives here as a plain message worth showing.
    sails.log.error("Upsert delivery zone error", error);
    return res.status(400).json({ error: (error as any)?.message ?? String(error) });
  }
}
