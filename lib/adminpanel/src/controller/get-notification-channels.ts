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

export default async function GetNotificationChannelsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    const routePrefix: string = (req.adminizer?.config?.routePrefix || "").replace(/\/$/, "");
    await NotificationManager.loadChannelsState();

    const channels = await Promise.all(
      NotificationManager.channels.map(async (channel: any) => {
        let ready = false;
        let readinessError: string | null = null;
        let configured = true;
        let configurationError: string | null = null;
        const enabled = typeof channel.isEnabled === "function"
          ? channel.isEnabled()
          : channel.enabled !== false;
        let status = typeof channel.status === "string" && channel.status.trim() !== ""
          ? channel.status
          : "ready";
        let channelError = typeof channel.error === "string" && channel.error.trim() !== ""
          ? channel.error
          : null;

        try {
          if (typeof channel.isConfigured === "function") {
            configured = await channel.isConfigured();
          }
        } catch (error) {
          configured = false;
          configurationError = String(error);
          status = "error";
          channelError = configurationError;
        }

        try {
          ready = await channel.isReady();
        } catch (error) {
          readinessError = String(error);
          status = "error";
          channelError = readinessError;
        }

        let configUrl: string | null = null;
        if (typeof channel.getConfigUrl === "function") {
          const raw = channel.getConfigUrl();
          if (typeof raw === "string" && raw.trim() !== "") {
            configUrl = /^https?:\/\//i.test(raw) || raw.startsWith(routePrefix + "/")
              ? raw
              : `${routePrefix}${raw.startsWith("/") ? "" : "/"}${raw}`;
          }
        }

        return {
          type: channel.type || "",
          forceSend: Boolean(channel.forceSend),
          forGroupTo: Array.isArray(channel.forGroupTo) ? channel.forGroupTo : [],
          sortOrder: Number.isFinite(Number(channel.sortOrder)) ? Number(channel.sortOrder) : null,
          cost: Number.isFinite(Number(channel.cost)) ? Number(channel.cost) : null,
          enabled,
          ready,
          readinessError,
          configured,
          configurationError,
          manualSendAvailable: enabled && configured && ready,
          status,
          error: channelError,
          configUrl,
          className: channel.constructor?.name || "",
        };
      })
    );

    return res.json({
      results: channels,
      meta: {
        total: channels.length,
      },
    });
  } catch (error) {
    sails.log.error("Get notification channels error", error);
    return res.status(500).json({ error: String(error) });
  }
}
