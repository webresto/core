import { NotificationDispatcher } from "../../../../libs/NotificationDispatcher";

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
  try {
    if (!hasAccess(req, res)) return;

    const {
      userId,
      groupTo,
      title,
      body,
      badge,
      data,
    } = req.body || {};

    const normalizedGroupTo = String(groupTo || "user").trim().toLowerCase();
    const normalizedTitle = String(title || "").trim();
    const normalizedBody = String(body || "").trim();
    const normalizedBadge = String(badge || "info").trim().toLowerCase();

    if (!["user", "manager"].includes(normalizedGroupTo)) {
      return res.status(400).json({ error: "Invalid groupTo" });
    }
    if (!["info", "error"].includes(normalizedBadge)) {
      return res.status(400).json({ error: "Invalid badge" });
    }
    if (!normalizedTitle) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!normalizedBody) {
      return res.status(400).json({ error: "Body is required" });
    }

    let user: any = null;
    if (normalizedGroupTo === "user") {
      const normalizedUserId = String(userId || "").trim();
      if (!normalizedUserId) {
        return res.status(400).json({ error: "User is required for user notifications" });
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
        return res.status(404).json({ error: "User not found" });
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
