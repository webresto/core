import { NotificationTypeRegistry } from "../../../../libs/NotificationTypeRegistry";

function hasAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission("notifications-manager", req.user)) {
    res.sendStatus(403);
    return false;
  }
  return true;
}

/**
 * GET /core/notifications-manager/type?key=...
 * Returns a single notification type (including its full template configuration).
 */
export default async function GetNotificationTypeController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res)) return;

    const key = String(req.query?.key || "").trim();
    if (!key) {
      return res.status(400).json({ error: t("Notification type key is required") });
    }

    await NotificationTypeRegistry.load();
    const type = NotificationTypeRegistry.get(key);
    if (!type) {
      return res.status(404).json({ error: t("Notification type not found") });
    }

    return res.json({ type });
  } catch (error) {
    sails.log.error("Get notification type error", error);
    return res.status(500).json({ error: String(error) });
  }
}
