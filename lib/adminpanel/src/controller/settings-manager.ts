import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";

/**
 * Identifies this process run. The settings page uses it to drop its "restart pending"
 * notice: a value that only takes effect at boot is applied once the app comes back up
 * with a different boot id, so the reminder must not survive the restart it asked for.
 */
const BOOT_ID = `${process.pid}-${Math.round(Date.now() - process.uptime() * 1000)}`;

function isAdmin(req: any): boolean {
  return req.user?.isAdministrator === true;
}

export default function SettingsManagerController(req: any, res: any) {
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  }
  if (!isAdmin(req)) {
    return res.sendStatus(403);
  }

  return req.Inertia.render({
    component: 'module',
    props: {
      moduleComponent: adminModuleUrl("SettingsManager"),
      locale,
      messages,
      bootId: BOOT_ID
    }
  });
}
