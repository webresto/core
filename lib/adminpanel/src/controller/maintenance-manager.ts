import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { hasAccess } from "./marketing-helpers";
import { MAINTENANCE_RIGHT } from "./maintenance-helpers";

/** The page "Scheduled maintenance": the periods the site is closed for orders, with the text the customers see. */
export default function MaintenanceManagerController(req: any, res: any) {
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!hasAccess(req, res, MAINTENANCE_RIGHT)) return;

  return req.Inertia.render({
    component: "module",
    props: { moduleComponent: adminModuleUrl("MaintenanceManager"), locale, messages },
  });
}
