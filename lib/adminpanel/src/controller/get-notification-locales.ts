function hasAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (!hasModulePermission(req, NOTIFICATIONS_ACCESS, "view")) {
    res.sendStatus(403);
    return false;
  }
  return true;
}

const FALLBACK_LOCALES = ["en"];

/**
 * GET /core/notifications-manager/locales
 * Returns the locale codes the multilingual site is configured for, used by the notification
 * template editor's locale picker, plus the configured default locale.
 *
 * The source of truth is `sails.config.i18n.locales` (the same list that drives site
 * translations and `bindLocales`), so notifications don't need a separate AVAILABLE_LOCALES
 * setting. The default is `DEFAULT_LOCALE` (runtime setting) → `sails.config.i18n.defaultLocale` → "en".
 */
export default async function GetNotificationLocalesController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    const configured = (sails.config as any)?.i18n?.locales;
    let locales: string[] = Array.isArray(configured)
      ? configured.map((item: any) => String(item || "").trim()).filter(Boolean)
      : [];
    if (locales.length === 0) locales = [...FALLBACK_LOCALES];

    let defaultLocale = "";
    try {
      const def = await Settings.get("DEFAULT_LOCALE");
      if (def) defaultLocale = String(def);
    } catch (_error) { /* Settings may be unavailable */ }
    if (!defaultLocale) defaultLocale = String((sails.config as any)?.i18n?.defaultLocale || "en");

    // Keep the default present in the list so the picker can always select it.
    if (defaultLocale && !locales.includes(defaultLocale)) locales = [defaultLocale, ...locales];

    return res.json({ results: locales, defaultLocale, meta: { total: locales.length } });
  } catch (error) {
    sails.log.error("Get notification locales error", error);
    return res.status(500).json({ error: String(error) });
  }
}
