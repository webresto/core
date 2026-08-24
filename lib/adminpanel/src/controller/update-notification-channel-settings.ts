import { NotificationManager } from "../../../../libs/NotificationManager";
import { hasModulePermission, NOTIFICATIONS_ACCESS } from "./access-rights";

function hasAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (!hasModulePermission(req, NOTIFICATIONS_ACCESS, "manage")) {
    res.sendStatus(403);
    return false;
  }
  return true;
}
export default async function UpdateNotificationChannelSettingsController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  try {
    if (!hasAccess(req, res)) return;

    const type = String(req.body?.type || "").trim();
    if (!type) {
      return res.status(400).json({ error: t("Channel type is required") });
    }

    const channel: any = NotificationManager.channels.find((item: any) => item.type === type);
    if (!channel) {
      return res.status(404).json({ error: t("Notification channel not found") });
    }

    const updates: { enabled?: boolean; sortOrder?: number; cost?: number; stopEscalation?: boolean } = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "enabled")) {
      updates.enabled = req.body?.enabled === true;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "sortOrder")) {
      const sortOrder = Number(req.body?.sortOrder);
      if (!Number.isFinite(sortOrder)) {
        return res.status(400).json({ error: t("Invalid channel weight") });
      }
      updates.sortOrder = sortOrder;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "cost")) {
      const cost = Number(req.body?.cost);
      if (!Number.isFinite(cost) || cost < 0) {
        return res.status(400).json({ error: t("Invalid channel cost") });
      }
      updates.cost = cost;
    }

    // Terminal channel: a successful send here ends the waterfall (no unread escalation
    // to a further, usually paid, channel). See Channel.stopEscalation.
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "stopEscalation")) {
      updates.stopEscalation = req.body?.stopEscalation === true;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: t("No channel settings to update") });
    }

    const updatedChannel = await NotificationManager.setChannelSettings(type, updates);
    if (!updatedChannel) {
      return res.status(404).json({ error: t("Notification channel not found") });
    }

    return res.json({
      success: true,
      channel: {
        type: updatedChannel.type || "",
        enabled: typeof updatedChannel.isEnabled === "function" ? updatedChannel.isEnabled() : updatedChannel.enabled !== false,
        sortOrder: Number.isFinite(Number(updatedChannel.sortOrder)) ? Number(updatedChannel.sortOrder) : null,
        cost: Number.isFinite(Number(updatedChannel.cost)) ? Number(updatedChannel.cost) : null,
        stopEscalation: typeof updatedChannel.isStopEscalation === "function"
          ? updatedChannel.isStopEscalation()
          : (updatedChannel as any).stopEscalation === true,
        status: updatedChannel.status || "ready",
        error: updatedChannel.error || null,
      },
    });
  } catch (error) {
    sails.log.error("Update notification channel settings error", error);
    return res.status(500).json({ error: String(error) });
  }
}
