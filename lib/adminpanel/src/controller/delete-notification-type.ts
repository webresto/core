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
 * POST /core/notifications-manager/type-delete   (write operation)
 * Removes a notification type from the catalog by key.
 */
export default async function DeleteNotificationTypeController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res)) return;

    const key = String(req.body?.key || "").trim();
    if (!key) {
      return res.status(400).json({ error: t("Notification type key is required") });
    }

    await NotificationTypeRegistry.load();
    const removed = await NotificationTypeRegistry.remove(key);
    if (!removed) {
      return res.status(404).json({ success: false, error: t("Notification type not found") });
    }

    return res.json({ success: true });
  } catch (error) {
    sails.log.error("Delete notification type error", error);
    return res.status(500).json({ error: String(error) });
  }
}
