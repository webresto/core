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

    const channels = await Promise.all(
      NotificationManager.channels.map(async (channel) => {
        let ready = false;
        let readinessError: string | null = null;

        try {
          ready = await channel.isReady();
        } catch (error) {
          readinessError = String(error);
        }

        return {
          type: channel.type || "",
          forceSend: Boolean(channel.forceSend),
          forGroupTo: Array.isArray(channel.forGroupTo) ? channel.forGroupTo : [],
          sortOrder: Number.isFinite(Number(channel.sortOrder)) ? Number(channel.sortOrder) : null,
          cost: Number.isFinite(Number((channel as any).cost)) ? Number((channel as any).cost) : null,
          ready,
          readinessError,
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
