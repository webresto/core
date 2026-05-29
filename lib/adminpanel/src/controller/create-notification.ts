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
      groupTo,
      title,
      body,
      badge,
      data,
      channelTypes,
    } = req.body || {};

    const normalizedGroupTo = String(groupTo || "user").trim().toLowerCase();
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

    await NotificationManager.loadChannelsState();
    const defaultChannelTypes: string[] = [];
    if (!Array.isArray(channelTypes)) {
      for (const channel of NotificationManager.channels as any[]) {
        const type = String(channel.type || "").trim();
        if (!type || !Array.isArray(channel.forGroupTo) || !channel.forGroupTo.includes(normalizedGroupTo)) continue;
        if (typeof channel.isEnabled === "function" ? !channel.isEnabled() : channel.enabled === false) continue;
        if (typeof channel.isConfigured === "function" && !(await channel.isConfigured())) continue;
        if (typeof channel.isReady === "function" && !(await channel.isReady())) continue;
        defaultChannelTypes.push(type);
      }
    }
    const normalizedChannelTypes = Array.isArray(channelTypes)
      ? Array.from(new Set(channelTypes.map((item: any) => String(item || "").trim()).filter(Boolean)))
      : defaultChannelTypes;
    if (normalizedChannelTypes.length === 0) {
      return res.status(400).json({ error: t("Choose at least one notification channel") });
    }

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

    let user: any = null;
    if (normalizedGroupTo === "user") {
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

    await NotificationDispatcher.send(
      user,
      normalizedTitle,
      normalizedBody,
      data && typeof data === "object" ? data : null,
      normalizedBadge as "info" | "error",
      undefined,
      normalizedGroupTo as "user" | "manager",
      normalizedChannelTypes,
    );

    return res.json({ success: true });
  } catch (error) {
    sails.log.error("Create notification error", {
      error: String(error),
      body: req.body,
    });
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
