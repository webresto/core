import { NotificationEventRegistry } from "../../../../libs/NotificationEventRegistry";
import { NotificationTypeRegistry } from "../../../../libs/NotificationTypeRegistry";
import { NotificationService } from "../../../../libs/NotificationService";

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
 * POST /core/notifications-manager/emit-test
 * Fires a notification event through NotificationService. dryRun defaults to true — resolves
 * which enabled types match and how they render WITHOUT creating/sending. dryRun:false actually
 * creates Notification records and runs the delivery waterfall (a write operation). HTTP wrapper
 * over the logic already used by the MCP `notification-emit-test` tool (MCP is prod-gated).
 */
export default async function EmitTestNotificationController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res)) return;

    const eventKey = String(req.body?.eventKey || "").trim();
    if (!eventKey) {
      return res.status(400).json({ error: t("Event key is required") });
    }

    const { recipient, context, meta } = req.body || {};
    const dryRun = req.body?.dryRun !== false; // default true

    await NotificationTypeRegistry.load();
    const registered = NotificationEventRegistry.isRegistered(eventKey);
    const matchedTypes = NotificationTypeRegistry.getByEvent(eventKey).map((type) => type.key);
    const results = await NotificationService.emit(eventKey, { recipient, context, meta }, dryRun);

    return res.json({ eventKey, registered, dryRun, matchedTypes, results });
  } catch (error) {
    sails.log.error("Emit test notification error", error);
    return res.status(500).json({ error: String(error) });
  }
}
