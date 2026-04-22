import { getInertiaLocaleAndMessages } from "./i18n-messages";

export default function StockManagerController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  }

  return req.Inertia.render({
    component: 'module',
    props: {
      moduleComponent: `/restocore/assets/core-adminizer-assets/StockManager.js`,
      message: t('Stock Manager'),
      locale,
      messages
    }
  });
}
