export default function StockManagerController(req: any, res: any) {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  }

  return req.Inertia.render({
    component: 'module',
    props: {
      moduleComponent: `/restocore/assets/stockmanager/StockManager.js`,
      message: 'Hello from Stock Manager',
      locale: req.user?.language || req.user?.locale || 'en'
    }
  });
}
