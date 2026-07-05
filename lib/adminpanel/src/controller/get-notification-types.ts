import { NotificationTypeRegistry } from "../../../../libs/NotificationTypeRegistry";
import { hasModulePermission, NOTIFICATIONS_ACCESS } from "./access-rights";

function hasAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (!hasModulePermission(req, NOTIFICATIONS_ACCESS, "view")) {
    res.sendStatus(403);
    return false;
  }
  return true;
}

/**
 * GET /core/notifications-manager/types
 * Lists the notification types catalog (NotificationRules model). Optional filters: eventKey, enabled.
 * Thin wrapper over NotificationTypeRegistry.getAll (logic lives in libs).
 */
export default async function GetNotificationTypesController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    await NotificationTypeRegistry.load();
    let types = NotificationTypeRegistry.getAll();

    const eventKey = String(req.query?.eventKey || "").trim();
    if (eventKey) types = types.filter((type) => type.eventKey === eventKey);

    if (Object.prototype.hasOwnProperty.call(req.query || {}, "enabled")) {
      const raw = String(req.query.enabled).toLowerCase();
      if (raw === "true" || raw === "false") {
        const enabled = raw === "true";
        types = types.filter((type) => Boolean(type.enabled) === enabled);
      }
    }

    return res.json({ results: types, meta: { total: types.length } });
  } catch (error) {
    sails.log.error("Get notification types error", error);
    return res.status(500).json({ error: String(error) });
  }
}
