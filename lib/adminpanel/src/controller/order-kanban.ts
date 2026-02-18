function normalizeLocale(rawLocale: unknown): string {
  const value = String(rawLocale || "").trim().toLowerCase().replace(/_/g, "-");
  if (value.startsWith("ru")) return "ru";
  if (value.startsWith("en")) return "en";
  return "en";
}

export default function OrderKanbanController(req: any, res: any) {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`order-kanban`, req.user)) {
    return res.sendStatus(403);
  }

  return req.Inertia.render({
    component: 'module',
    props: {
      moduleComponent: `/restocore/assets/stockmanager/OrderKanban.js`,
      message: 'Current Orders',
      locale: normalizeLocale(req.user?.language || req.user?.locale)
    }
  });
}
