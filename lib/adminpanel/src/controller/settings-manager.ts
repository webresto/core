import { getInertiaLocaleAndMessages } from "./i18n-messages";

function isAdmin(req: any): boolean {
  return req.user?.isAdministrator === true;
}

export default function SettingsManagerController(req: any, res: any) {
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  }
  if (!isAdmin(req)) {
    return res.sendStatus(403);
  }

  return req.Inertia.render({
    component: 'module',
    props: {
      moduleComponent: `/restocore/assets/core-adminizer-assets/SettingsManager.js`,
      locale,
      messages
    }
  });
}
