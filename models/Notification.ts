import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
import NotificationLogHelper, { NotificationLogLevel, NotificationLogEntry } from "../libs/NotificationLogHelper";

export interface NotificationChannelEntry {
  /** Channel type identifier, e.g. "fcm-mobile", "test-free-unreliable" */
  type: string;
  /** Cost of this channel send (same units as Channel.cost) */
  cost: number;
  /** Timestamp (ms) when the message was sent via this channel */
  sentAt: number;
}

let attributes = {

  /** UUID generated in beforeCreate. Also used as the read token. */
  id: {
    type: "string",
  } as unknown as string,

  user: {
    model: "user",
    required: false,
  } as unknown as UserRecord | string | null,

  title: {
    type: "string",
  } as unknown as string,

  body: {
    type: "string",
  } as unknown as string,

  /** Arbitrary payload: { type, orderId, render, routing, ... } */
  data: "json" as unknown as object | null,

  /**
   * Notification type key from the NOTIFICATION_TYPES catalog (when typed).
   * null means an untyped send, e.g. manual creation from the admin panel.
   */
  notificationTypeKey: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** Business event key (NotificationEventRegistry) that produced this notification. */
  eventKey: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /**
   * Full business event context (order/user/store/...). Passed to the channel adapter,
   * which extracts the fields it needs (push-notifications.md "single contract").
   */
  context: "json" as unknown as object | null,

  /**
   * Per-message delivery cost limit (from the type's maxDeliveryCost setting).
   * Takes priority over the global NOTIFICATION_MAX_COST_PER_MESSAGE.
   * null means the type limit is not set and the global fallback applies.
   */
  maxDeliveryCost: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /**
   * Time (ms) before which delivery must not run (sendDelaySec).
   * null/past means deliver immediately. Future values are picked up by the delivery loop when due.
   */
  scheduledAt: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** Idempotency/correlation key for deduplication and scheduled-delivery cancellation. */
  idempotencyKey: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /**
   * Lifecycle:
   * pending    -> record created, delivery has not been attempted yet (or waits for scheduledAt)
   * processing -> claimed by a delivery worker (atomic CAS pending→processing); stale claims
   *               (crashed worker) are recovered by the delivery loop after a timeout
   * sent       -> channel accepted the message without error (FCM does not guarantee device delivery)
   * failed     -> all channels returned errors. Terminal for automatic delivery: the failed
   *               attempts already consumed the waterfall (deliveryAttempts), so the loop does NOT
   *               retry it. Manual re-delivery is available via the admin "retry" action.
   * read       -> frontend acknowledged it via markNotificationRead(id)
   * cancelled  -> sending was cancelled before delivery, e.g. a follow-up for an already completed order
   */
  status: {
    type: "string",
    isIn: ["pending", "processing", "sent", "failed", "read", "cancelled"],
    defaultsTo: "pending",
  } as unknown as "pending" | "processing" | "sent" | "failed" | "read" | "cancelled",

  /** Target group, needed by _deliver() during recovery. */
  groupTo: {
    type: "string",
    isIn: ["user", "manager"],
    defaultsTo: "user",
  } as unknown as "user" | "manager",

  /** Read timestamp (ms), null until read. */
  readAt: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** Delivery channels with details: type, cost, and send time (actually sent). */
  channels: "json" as unknown as NotificationChannelEntry[],

  /** Channel types selected for delivery when the notification was created. */
  requestedChannels: "json" as unknown as string[],

  /**
   * Total cost of all channels through which the notification was sent.
   * Accumulates during delivery and escalation. 0 = free channels only.
   */
  spentCost: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** Log of all delivery attempts, escalations, and errors. */
  logs: "json" as unknown as NotificationLogEntry[],

  /**
   * Important message. Important notifications are not subject to the waterfall channel limit
   * (NOTIFICATION_MAX_CHANNELS_PER_MESSAGE); they escalate across all channels until success.
   */
  important: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  /**
   * Total number of channel delivery attempts (successful + failed),
   * accumulated during initial delivery and escalations. Used for the waterfall limit.
   */
  deliveryAttempts: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /**
   * Terminal flag for the unread-escalation loop. Set when escalation can never proceed
   * for this record (channel limit reached / no remaining channels / device-targeted
   * notification without user). Once true, the record is excluded from the loop forever —
   * prevents endless rescans and unbounded `logs` growth.
   */
  escalationExhausted: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  badge: {
    type: "string",
    isIn: ["info", "error"],
    defaultsTo: "info",
  } as unknown as "info" | "error",

  // autoCreatedAt/autoUpdatedAt are required: without them Waterline leaves these
  // null, and the admin dashboard/history/activity (which query and sort by a time
  // window, default "today") render empty even though records exist.
  createdAt: {
    type: "number",
    autoCreatedAt: true,
  } as unknown as number,

  updatedAt: {
    type: "number",
    autoUpdatedAt: true,
  } as unknown as number,
};

type attributes = typeof attributes;
interface Notification extends RequiredField<OptionalAll<attributes>, null>, ORM {}
export interface NotificationRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {}

let Model = {
  beforeCreate(init: NotificationRecord, cb: (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }
    cb();
  },

  async log(criteria: CriteriaQuery<NotificationRecord>, level: NotificationLogLevel, module: string, message: string, ...data: any[]): Promise<void> {
    return NotificationLogHelper.log(criteria, level, module, message, ...data);
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Notification: typeof Model & ORMModel<NotificationRecord, "readAt" | "data" | "channels" | "requestedChannels" | "logs" | "spentCost" | "important" | "deliveryAttempts" | "escalationExhausted" | "notificationTypeKey" | "eventKey" | "context" | "maxDeliveryCost" | "scheduledAt" | "idempotencyKey">;
}
