import { hasAccess } from "./marketing-helpers";
import { MAINTENANCE_RIGHT, maintenancesForAdmin } from "./maintenance-helpers";

/** GET …/core/maintenance - the maintenances and the one that closes the site now. */
export default async function GetMaintenancesController(req: any, res: any) {
  if (!hasAccess(req, res, MAINTENANCE_RIGHT)) return;
  try {
    res.json(await maintenancesForAdmin());
  } catch (error) {
    sails.log.error("Core > admin > maintenance:", error);
    res.status(500).json({ error: "The maintenances are not loaded" });
  }
}
