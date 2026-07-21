import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { getModulePermissions, NOTIFICATIONS_ACCESS, requireModulePermission } from "./access-rights";

export default function NotificationsManagerController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!requireModulePermission(req, res, NOTIFICATIONS_ACCESS, "view")) return;
  const permissions = getModulePermissions(req, NOTIFICATIONS_ACCESS);

  return req.Inertia.render({
    component: "module",
    props: {
      moduleComponent: `/restocore/assets/core-adminizer-assets/NotificationsManager.js?v=20260721-1`,
      message: t("notifications"),
      locale,
      messages,
      permissions,
      canManage: permissions.canManage,
    }
  });
}
