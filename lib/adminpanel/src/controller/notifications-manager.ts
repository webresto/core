function normalizeLocale(rawLocale: unknown): string {
  const value = String(rawLocale || "").trim().toLowerCase().replace(/_/g, "-");
  if (value.startsWith("es")) return "es";
  if (value.startsWith("zh")) return "zh";
  if (value.startsWith("hi")) return "hi";
  if (value.startsWith("ar")) return "ar";
  if (value.startsWith("ru")) return "ru";
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("ua") || value.startsWith("uk")) return "ua";
  if (value.startsWith("en")) return "en";
  return "en";
}

export default function NotificationsManagerController(req: any, res: any) {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission("notifications-manager", req.user)) {
    return res.sendStatus(403);
  }

  return req.Inertia.render({
    component: "module",
    props: {
      moduleComponent: `/restocore/assets/stockmanager/NotificationsManager.js?v=20260407-2`,
      message: "Notifications",
      locale: normalizeLocale(req.user?.language || req.user?.locale),
    }
  });
}
