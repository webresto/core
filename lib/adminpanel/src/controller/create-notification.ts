import { NotificationDispatcher } from "../../../../libs/NotificationDispatcher";
import { NotificationManager } from "../../../../libs/NotificationManager";

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

export default async function CreateNotificationController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  try {
    if (!hasAccess(req, res)) return;

    const {
      userId,
      deviceId,
      groupTo,
      title,
      body,
      badge,
      data,
      channelTypes,
      important,
      priorityDeviceOnly,
    } = req.body || {};

    const normalizedImportant = important === true || important === "true" || important === 1;
    const normalizedPriorityDeviceOnly = priorityDeviceOnly === true || priorityDeviceOnly === "true" || priorityDeviceOnly === 1;

    const normalizedDeviceId = String(deviceId || "").trim();
    // Отправка прямо на устройство (корзина/гостевой девайс): адресуется как "user"-доставка,
    // но без обязательного userId — push уходит на конкретный UserDevice.
    const normalizedGroupTo = normalizedDeviceId
      ? "user"
      : String(groupTo || "user").trim().toLowerCase();
    const normalizedTitle = String(title || "").trim();
    const normalizedBody = String(body || "").trim();
    const normalizedBadge = String(badge || "info").trim().toLowerCase();

    if (!["user", "manager"].includes(normalizedGroupTo)) {
      return res.status(400).json({ error: t("Invalid group") });
    }
    if (!["info", "error"].includes(normalizedBadge)) {
      return res.status(400).json({ error: t("Invalid badge") });
    }
    if (!normalizedTitle) {
      return res.status(400).json({ error: t("Title is required") });
    }
    if (!normalizedBody) {
      return res.status(400).json({ error: t("Body is required") });
    }

    let user: any = null;
    let priorityDevice: any = undefined;

    if (normalizedDeviceId) {
      // Таргет — корзина/устройство: шлём на конкретный UserDevice по его id.
      const UserDeviceModel = (globalThis as any).UserDevice;
      priorityDevice = await UserDeviceModel.findOne({ id: normalizedDeviceId }).populate("user");
      if (!priorityDevice) {
        return res.status(404).json({ error: t("Device not found") });
      }
      if (!priorityDevice.notificationToken) {
        return res.status(400).json({ error: t("Device has no notification token") });
      }
      // Если устройство привязано к пользователю — используем его (для истории/ссылок).
      user = priorityDevice.user && typeof priorityDevice.user === "object" ? priorityDevice.user : null;
    } else if (normalizedGroupTo === "user") {
      const normalizedUserId = String(userId || "").trim();
      if (!normalizedUserId) {
        return res.status(400).json({ error: t("User is required for user notifications") });
      }

      user = await User.findOne({
        where: {
          or: [
            { id: normalizedUserId },
            { login: normalizedUserId },
          ],
        },
      });

      if (!user) {
        return res.status(404).json({ error: t("User not found") });
      }
    }

    if (normalizedPriorityDeviceOnly && !priorityDevice) {
      return res.status(400).json({ error: t("Priority device requires selected device") });
    }

    await NotificationManager.loadChannelsState();
    const defaultChannelTypes: string[] = [];
    if (!normalizedPriorityDeviceOnly && !Array.isArray(channelTypes)) {
      for (const channel of NotificationManager.channels as any[]) {
        const type = String(channel.type || "").trim();
        if (!type || !Array.isArray(channel.forGroupTo) || !channel.forGroupTo.includes(normalizedGroupTo)) continue;
        if (typeof channel.isEnabled === "function" ? !channel.isEnabled() : channel.enabled === false) continue;
        if (typeof channel.isConfigured === "function" && !(await channel.isConfigured())) continue;
        if (typeof channel.isReady === "function" && !(await channel.isReady())) continue;
        defaultChannelTypes.push(type);
      }
    }
    const normalizedChannelTypes = normalizedPriorityDeviceOnly
      ? []
      : Array.isArray(channelTypes)
        ? Array.from(new Set(channelTypes.map((item: any) => String(item || "").trim()).filter(Boolean)))
        : defaultChannelTypes;

    if (!normalizedPriorityDeviceOnly && normalizedChannelTypes.length === 0) {
      return res.status(400).json({ error: t("Choose at least one notification channel") });
    }

    if (!normalizedPriorityDeviceOnly) {
      for (const channelType of normalizedChannelTypes) {
        const channel: any = NotificationManager.channels.find((item: any) => item.type === channelType);
        if (!channel) {
          return res.status(400).json({ error: t("Notification channel not found") });
        }
        if (!Array.isArray(channel.forGroupTo) || !channel.forGroupTo.includes(normalizedGroupTo)) {
          return res.status(400).json({ error: t("Notification channel is not available for selected target") });
        }
        if (typeof channel.isEnabled === "function" ? !channel.isEnabled() : channel.enabled === false) {
          return res.status(400).json({ error: t("Notification channel is disabled") });
        }
        if (typeof channel.isConfigured === "function" && !(await channel.isConfigured())) {
          return res.status(400).json({ error: t("Notification channel is not configured") });
        }
        if (typeof channel.isReady === "function" && !(await channel.isReady())) {
          return res.status(400).json({ error: t("Notification channel is not ready") });
        }
      }
    }

    const notification = await NotificationDispatcher.send({
      user,
      title: normalizedTitle,
      body: normalizedBody,
      data: data && typeof data === "object" ? data : null,
      badge: normalizedBadge as "info" | "error",
      priorityDevice,
      groupTo: normalizedGroupTo as "user" | "manager",
      channelTypes: normalizedChannelTypes,
      important: normalizedImportant,
      priorityDeviceOnly: normalizedPriorityDeviceOnly,
    });

    return res.json({
      success: true,
      notification: notification ? {
        id: notification.id,
        title: notification.title || "",
        body: notification.body || "",
        status: notification.status || "pending",
        groupTo: notification.groupTo || normalizedGroupTo,
        createdAt: notification.createdAt || null,
      } : null,
    });
  } catch (error) {
    sails.log.error("Create notification error", {
      error: String(error),
      body: req.body,
    });
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
