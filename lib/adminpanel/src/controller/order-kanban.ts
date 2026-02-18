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
      locale: req.user?.language || req.user?.locale || 'en'
    }
  });
}
