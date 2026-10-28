import { hasAccess } from "./marketing-helpers";
import { MAINTENANCE_RIGHT, Refusal, maintenanceValues, maintenancesForAdmin } from "./maintenance-helpers";

/**
 * POST …/core/maintenance - a new maintenance; POST …/core/maintenance/:id - the fields sent of one.
 * Answers the list anew: a change may open or close the site.
 */
export default async function SaveMaintenanceController(req: any, res: any) {
  if (!hasAccess(req, res, MAINTENANCE_RIGHT)) return;
  try {
    const id = req.params?.id;
    let saved: { id?: string } | undefined;
    if (id) {
      if (!(await Maintenance.findOne!({ id }))) return res.status(404).json({ error: "The maintenance is not found" });
      // ORMModel types updateOne as the update of many
      saved = (await Maintenance.updateOne!({ id }).set(maintenanceValues(req.body, false))) as unknown as { id?: string };
    } else {
      saved = await Maintenance.create!(maintenanceValues(req.body, true) as any).fetch();
    }
    res.json({ id: saved?.id, ...(await maintenancesForAdmin()) });
  } catch (error) {
    if (error instanceof Refusal) return res.status(400).json({ error: error.message });
    sails.log.error("Core > admin > maintenance:", error);
    res.status(500).json({ error: "The maintenance is not saved" });
  }
}
