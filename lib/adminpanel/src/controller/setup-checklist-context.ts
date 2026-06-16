import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { CheckupContext } from "../../../../libs/SetupChecklistRegistry";

/** Access gate shared by the setup-checklist API controllers. */
export function hasChecklistAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (
    req.adminizer?.accessRightsHelper &&
    !req.adminizer.accessRightsHelper.hasPermission("setup-checklist", req.user)
  ) {
    res.sendStatus(403);
    return false;
  }
  return true;
}

/**
 * Build the CheckupContext for a request: resolved locale + a server-side translator that
 * mirrors the frontend I18nContext (`messages[key] || key` with `{param}` interpolation),
 * so checkup titles/details come back already localized.
 */
export function buildCheckupContext(req: any): CheckupContext {
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  const t = (key: string, params?: Record<string, string | number>): string => {
    let str = messages[key] ?? key;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        str = str.replace(new RegExp(`{${paramKey}}`, "g"), String(paramValue));
      }
    }
    return str;
  };
  return { locale, t, now: new Date() };
}
