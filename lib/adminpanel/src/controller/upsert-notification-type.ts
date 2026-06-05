import { NotificationTypeRegistry, NotificationType } from "../../../../libs/NotificationTypeRegistry";

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
 * POST /core/notifications-manager/type   (write operation)
 * Creates or updates a notification type. Body is the type object (or { type: {...} }).
 * Validates key (snake_case) + eventKey via NotificationTypeRegistry.validate before persisting.
 */
export default async function UpsertNotificationTypeController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res)) return;

    const body = req.body || {};
    const type = (body.type && typeof body.type === "object" ? body.type : body) as NotificationType;
    if (!type || typeof type !== "object" || Array.isArray(type)) {
      return res.status(400).json({ error: t("Notification type payload is required") });
    }

    await NotificationTypeRegistry.load();
    const errors = NotificationTypeRegistry.validate(type);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Soft path check against the event's context schema: never blocks saving,
    // surfaced as warnings so the operator can fix typos in {{paths}}.
    const warnings = NotificationTypeRegistry.checkTemplateVariables(type);

    const saved = await NotificationTypeRegistry.upsert(type);
    return res.json({ success: true, type: saved, warnings });
  } catch (error) {
    sails.log.error("Upsert notification type error", error);
    return res.status(500).json({ error: String(error) });
  }
}
