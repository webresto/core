import { hasAccess } from "./marketing-helpers";
import { MAINTENANCE_RIGHT, maintenancesForAdmin } from "./maintenance-helpers";

/** POST …/core/maintenance/:id/delete - a maintenance gone; the list anew. */
export default async function DeleteMaintenanceController(req: any, res: any) {
  if (!hasAccess(req, res, MAINTENANCE_RIGHT)) return;
  try {
    if (!(await Maintenance.destroyOne!({ id: req.params.id } as any))) return res.status(404).json({ error: "The maintenance is not found" });
    res.json(await maintenancesForAdmin());
  } catch (error) {
    sails.log.error("Core > admin > maintenance:", error);
    res.status(500).json({ error: "The maintenance is not saved" });
  }
}
