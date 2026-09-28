import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { getDeliveryZonePermissions, hasAccess } from "./delivery-zones-helpers";

export default async function DeliveryZonesManagerController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!(await hasAccess(req, res))) return;
  const permissions = getDeliveryZonePermissions(req);

  return req.Inertia.render({
    component: "module",
    props: {
      moduleComponent: adminModuleUrl("DeliveryZonesManager"),
      message: t("Delivery zones"),
      locale,
      messages,
      permissions,
      canManage: permissions.canManage,
    },
  });
}
