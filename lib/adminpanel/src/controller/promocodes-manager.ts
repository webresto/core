import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";

export default function PromoCodesManagerController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission("promocodes-manager", req.user)) {
    return res.sendStatus(403);
  }

  return req.Inertia.render({
    component: "module",
    props: {
      moduleComponent: adminModuleUrl("PromoCodesManager", "20260721-1"),
      message: t("Promo codes"),
      locale,
      messages,
    },
  });
}
