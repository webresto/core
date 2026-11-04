import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { hasAccess } from "./marketing-helpers";
import { bootId } from "../../../settings/boot";

export default function SettingsManagerController(req: any, res: any) {
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!hasAccess(req, res, "settings-manager")) return;

  return req.Inertia.render({
    component: 'module',
    props: {
      moduleComponent: adminModuleUrl("SettingsManager"),
      locale,
      messages,
      bootId: bootId()
    }
  });
}
