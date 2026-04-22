import { NotificationDispatcher } from "../../../../libs/NotificationDispatcher";

const NotificationModel = (globalThis as any).Notification;

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

export default async function RetryNotificationController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  try {
    if (!hasAccess(req, res)) return;

    const id = String(req.body?.id || "").trim();
    if (!id) {
      return res.status(400).json({ error: t("Invalid notification id") });
    }

    const notification = await NotificationModel.findOne({ id });
    if (!notification) {
      return res.status(404).json({ error: t("Notification not found") });
    }

    await NotificationModel.log({ id }, "info", "adminizer", "notifications-manager: retry delivery", {
      byUserId: req.user?.id || null,
    });
    await NotificationDispatcher._deliver(notification);

    const updatedNotification = await NotificationModel.findOne({ id }).populate("user");
    return res.json({ success: true, notification: updatedNotification });
  } catch (error) {
    sails.log.error("Retry notification error", error);
    return res.status(500).json({ error: String(error) });
  }
}
