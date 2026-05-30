import { getInertiaLocaleAndMessages } from "./i18n-messages";

export default function NotificationsManagerController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission("notifications-manager", req.user)) {
    return res.sendStatus(403);
  }

  return req.Inertia.render({
    component: "module",
    props: {
      moduleComponent: `/restocore/assets/core-adminizer-assets/NotificationsManager.js?v=20260530-3`,
      message: t("notifications"),
      locale,
      messages,
    }
  });
}
