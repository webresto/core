/**
 * NotificationEventRegistry
 *
 * In-memory catalog of notification *events* (business triggers), e.g.
 * `order_accepted`, `order_on_the_way`, `user_birthday`, `user_otp_requested`.
 *
 * Important (see ai-notes/notifications-design-notes.md §2):
 *  - registering an event is NOT the same as enabling sending. A registered event
 *    on its own does not create notifications and does not start delivery.
 *  - sending is configured separately at the notification *type* level
 *    (NotificationTypeRegistry, backed by the NotificationRules model).
 *
 * Any module can register a new event through `registerEvent(...)`. The registry is
 * stored on a globalThis singleton so it survives hot-reload like
 * NotificationManager.channels.
 */

import { ContextField, ContextSchema, normalizeContextSchema } from "./notificationContextSchema";

/**
 * Context shapes shared by the core order/user events. These describe the branches
 * core passes to NotificationService.emit; they drive editor autocomplete and
 * unknown-`{{path}}` validation, so keep them in sync with the emit call sites.
 */
const CORE_USER_SCHEMA: ContextField = {
  type: "object",
  description: "The recipient user.",
  fields: {
    firstName: { type: "string", description: "User's first name.", example: "Alex" },
    lastName: { type: "string", description: "User's last name.", example: "Ivanov" },
    phone: { type: "string", description: "Phone number.", example: "+79991234567" },
    email: { type: "string", description: "Email address.", example: "alex@example.com" },
    birthday: { type: "date", description: "Date of birth." },
    locale: { type: "string", description: "Preferred locale.", example: "ru" },
  },
};

const CORE_ORDER_SCHEMA: ContextField = {
  type: "object",
  description: "The order this notification is about.",
  fields: {
    number: { type: "string", description: "Order number from the RMS/POS (falls back to shortId).", example: "152" },
    shortId: { type: "string", description: "Internal short order id (last 8 chars).", example: "A-1234" },
    state: { type: "string", description: "Current order state.", example: "ORDER" },
    total: { type: "number", description: "Grand total (currency units).", example: 540 },
    basketTotal: { type: "number", description: "Items subtotal before delivery.", example: 500 },
    deliveryCost: { type: "number", description: "Delivery cost.", example: 40 },
    dishesCount: { type: "number", description: "Number of dishes.", example: 3 },
    comment: { type: "string", description: "Customer comment.", example: "Leave at the door" },
    paymentMethod: { type: "string", description: "Payment method.", example: "card" },
    date: { type: "date", description: "Requested delivery/pickup time." },
    customer: {
      type: "object",
      description: "Customer contact details.",
      fields: {
        name: { type: "string", description: "Customer name.", example: "Alex" },
        phone: { type: "string", description: "Customer phone.", example: "+79991234567" },
      },
    },
    address: {
      type: "object",
      description: "Delivery address.",
      fields: {
        street: { type: "string", description: "Street.", example: "Lenina" },
        home: { type: "string", description: "House/building.", example: "10" },
        city: { type: "string", description: "City.", example: "Moscow" },
      },
    },
    dishes: {
      type: "array",
      description: "Ordered dishes.",
      items: {
        type: "object",
        fields: {
          name: { type: "string", description: "Dish name.", example: "Margherita" },
          amount: { type: "number", description: "Quantity.", example: 2 },
        },
      },
    },
  },
};

export interface NotificationEventDefinition {
  /** Unique event key, snake_case, e.g. "order_on_the_way" */
  key: string;
  /** Human-readable name */
  name: string;
  /** What triggers this event and when */
  description?: string;
  /** Module that registered the event (for diagnostics) */
  sourceModule?: string;
  /**
   * Which context branches are expected to be passed when emitting this event,
   * e.g. ["order", "user"]. Used for documentation / dry-run hints only.
   * Derived from `contextSchema` keys when omitted.
   */
  contextKeys?: string[];
  /**
   * Typed shape of the context branches (fields, types, descriptions). Drives the
   * template editor's autocomplete and the unknown-`{{path}}` validation. Optional:
   * an event without a schema is simply not path-validated (today's behaviour).
   */
  contextSchema?: ContextSchema;
}

const NOTIFICATION_EVENTS_GLOBAL_KEY = "__restoappNotificationEvents";

function getSharedEventsRegistry(): Map<string, NotificationEventDefinition> {
  const globalScope = globalThis as any;
  if (!(globalScope[NOTIFICATION_EVENTS_GLOBAL_KEY] instanceof Map)) {
    globalScope[NOTIFICATION_EVENTS_GLOBAL_KEY] = new Map<string, NotificationEventDefinition>();
  }
  return globalScope[NOTIFICATION_EVENTS_GLOBAL_KEY] as Map<string, NotificationEventDefinition>;
}

function normalizeKey(key: unknown): string {
  return String(key || "").trim();
}

export class NotificationEventRegistry {
  private static get registry(): Map<string, NotificationEventDefinition> {
    return getSharedEventsRegistry();
  }

  /**
   * Register (or update) a notification event. Idempotent: re-registering an
   * existing key merges/overwrites its metadata.
   */
  static registerEvent(definition: NotificationEventDefinition): NotificationEventDefinition | null {
    const key = normalizeKey(definition?.key);
    if (!key) {
      try {
        sails.log.warn("[NotificationEventRegistry] registerEvent called without a key");
      } catch (_e) { /* sails may be unavailable during early import */ }
      return null;
    }

    const contextSchema = normalizeContextSchema(definition.contextSchema);
    const explicitKeys = Array.isArray(definition.contextKeys)
      ? definition.contextKeys.map((item) => String(item)).filter(Boolean)
      : undefined;
    // Fall back to the schema's branch names so callers can supply just a schema.
    const contextKeys = explicitKeys && explicitKeys.length > 0
      ? explicitKeys
      : (contextSchema ? Object.keys(contextSchema) : undefined);

    const entry: NotificationEventDefinition = {
      key,
      name: String(definition.name || key),
      description: definition.description ? String(definition.description) : undefined,
      sourceModule: definition.sourceModule ? String(definition.sourceModule) : undefined,
      contextKeys,
      contextSchema,
    };

    NotificationEventRegistry.registry.set(key, entry);
    return entry;
  }

  static isRegistered(key: string): boolean {
    return NotificationEventRegistry.registry.has(normalizeKey(key));
  }

  static getEvent(key: string): NotificationEventDefinition | null {
    return NotificationEventRegistry.registry.get(normalizeKey(key)) || null;
  }

  static listEvents(): NotificationEventDefinition[] {
    return Array.from(NotificationEventRegistry.registry.values())
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  static unregisterEvent(key: string): boolean {
    return NotificationEventRegistry.registry.delete(normalizeKey(key));
  }

  /**
   * Register the events that ship with core. Called from afterHook.ts on boot.
   * Defaults per design notes §2: registered but not enabled for sending.
   */
  static registerCoreDefaults(): void {
    NotificationEventRegistry.registerEvent({
      key: "order_accepted",
      name: "Order accepted",
      description: "Fires when an order is accepted/created for processing.",
      sourceModule: "core",
      contextSchema: { order: CORE_ORDER_SCHEMA, user: CORE_USER_SCHEMA },
    });
    NotificationEventRegistry.registerEvent({
      key: "order_on_the_way",
      name: "Order on the way",
      description: "Fires when an order is dispatched and on the way to the customer.",
      sourceModule: "core",
      contextSchema: { order: CORE_ORDER_SCHEMA, user: CORE_USER_SCHEMA },
    });
    NotificationEventRegistry.registerEvent({
      key: "user_birthday",
      name: "User birthday",
      description: "Fires on the user's birthday.",
      sourceModule: "core",
      contextSchema: { user: CORE_USER_SCHEMA },
    });
    NotificationEventRegistry.registerEvent({
      key: "user_otp_requested",
      name: "User OTP requested",
      description: "Fires when a one-time password is requested by the user.",
      sourceModule: "core",
      contextSchema: {
        user: CORE_USER_SCHEMA,
        otp: {
          type: "object",
          description: "One-time password payload.",
          fields: {
            code: { type: "string", description: "The OTP code to show the user.", example: "482915" },
            ttlSec: { type: "number", description: "Seconds until the code expires.", example: 300 },
          },
        },
      },
    });
  }
}
