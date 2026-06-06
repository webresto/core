import { NotificationEventRegistry } from "../../../../libs/NotificationEventRegistry";
import { NotificationTypeRegistry } from "../../../../libs/NotificationTypeRegistry";
import { FlatContextPath, flattenSchema } from "../../../../libs/notificationContextSchema";

/** recipient.* is always injected by the renderer, so surface it in autocomplete too. */
const RECIPIENT_PATHS: FlatContextPath[] = [
  { path: "recipient", type: "object", description: "The delivery recipient (always available)." },
  { path: "recipient.userId", type: "string", description: "Recipient user id.", example: "u_123" },
  { path: "recipient.locale", type: "string", description: "Recipient locale.", example: "ru" },
];

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
 * GET /core/notifications-manager/events
 * Read-only catalog of registered notification events (business triggers). Events are
 * registered in code, never edited from the UI. Each event is augmented with the count of
 * bound notification types (total / enabled) for the Events section (§6).
 */
export default async function GetNotificationEventsController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    await NotificationTypeRegistry.load();
    const allTypes = NotificationTypeRegistry.getAll();

    const events = NotificationEventRegistry.listEvents().map((event) => {
      const boundTypes = allTypes.filter((type) => type.eventKey === event.key);
      // Flattened, dotted paths (+ recipient.*) so the template editor can drive
      // autocomplete and unknown-variable linting without re-walking the schema.
      const contextPaths = event.contextSchema
        ? [...flattenSchema(event.contextSchema), ...RECIPIENT_PATHS]
        : [];
      return {
        ...event,
        contextPaths,
        typesCount: boundTypes.length,
        enabledTypesCount: boundTypes.filter((type) => Boolean(type.enabled)).length,
      };
    });

    return res.json({ results: events, meta: { total: events.length } });
  } catch (error) {
    sails.log.error("Get notification events error", error);
    return res.status(500).json({ error: String(error) });
  }
}
