import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { hasAccess } from "./marketing-helpers";

/**
 * Identifies this process run. The settings page uses it to drop its "restart pending"
 * notice: a value that only takes effect at boot is applied once the app comes back up
 * with a different boot id, so the reminder must not survive the restart it asked for.
 */
const BOOT_ID = `${process.pid}-${Math.round(Date.now() - process.uptime() * 1000)}`;

export default function SettingsManagerController(req: any, res: any) {
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!hasAccess(req, res, "settings-manager")) return;

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
