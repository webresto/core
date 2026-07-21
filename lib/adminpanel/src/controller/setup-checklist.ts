import { getInertiaLocaleAndMessages } from "./i18n-messages";

/**
 * GET /setup-checklist
 * Inertia page that renders the setup checklist module. The checklist is informational and
 * navigational only — it blocks nothing. Live status is fetched by the frontend from
 * /core/setup-checklist/status (no caching).
 */
export default function SetupChecklistController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    return res.redirect(`${config.routePrefix}/model/userap/login`);
  } else if (
    req.adminizer?.accessRightsHelper &&
    !req.adminizer.accessRightsHelper.hasPermission("setup-checklist", req.user)
  ) {
    return res.sendStatus(403);
  }

  return req.Inertia.render({
    component: "module",
    props: {
      moduleComponent: `/restocore/assets/core-adminizer-assets/SetupChecklist.js?v=20260721-1`,
      message: t("Setup checklist"),
      locale,
      messages,
    },
  });
}
