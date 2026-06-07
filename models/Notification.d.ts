import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
import { NotificationLogLevel, NotificationLogEntry } from "../libs/NotificationLogHelper";
export interface NotificationChannelEntry {
    /** Channel type identifier, e.g. "fcm-mobile", "test-free-unreliable" */
    type: string;
    /** Cost of this channel send (same units as Channel.cost) */
    cost: number;
    /** Timestamp (ms) when the message was sent via this channel */
    sentAt: number;
}
declare let attributes: {
    /** UUID generated in beforeCreate. Also used as the read token. */
    id: string;
    user: UserRecord | string | null;
    title: string;
    body: string;
    /** Arbitrary payload: { type, orderId, render, routing, ... } */
    data: object | null;
    /**
     * Notification type key from the NOTIFICATION_TYPES catalog (when typed).
     * null means an untyped send, e.g. manual creation from the admin panel.
     */
    notificationTypeKey: string | null;
    /** Business event key (NotificationEventRegistry) that produced this notification. */
    eventKey: string | null;
    /**
     * Full business event context (order/user/store/...). Passed to the channel adapter,
     * which extracts the fields it needs (push-notifications.md "single contract").
     */
    context: object | null;
    /**
     * Per-message delivery cost limit (from the type's maxDeliveryCost setting).
     * Takes priority over the global NOTIFICATION_MAX_COST_PER_MESSAGE.
     * null means the type limit is not set and the global fallback applies.
     */
    maxDeliveryCost: number | null;
    /**
     * Time (ms) before which delivery must not run (sendDelaySec).
     * null/past means deliver immediately. Future values are picked up by the delivery loop when due.
     */
    scheduledAt: number | null;
    /** Idempotency/correlation key for deduplication and scheduled-delivery cancellation. */
    idempotencyKey: string | null;
    /**
     * Lifecycle:
     * pending   -> record created, delivery has not been attempted yet (or waits for scheduledAt)
     * sent      -> channel accepted the message without error (FCM does not guarantee device delivery)
     * failed    -> all channels returned errors, retry loop will pick it up
     * read      -> frontend acknowledged it via markNotificationRead(id)
     * cancelled -> sending was cancelled before delivery, e.g. a follow-up for an already completed order
     */
    status: "pending" | "sent" | "failed" | "read" | "cancelled";
    /** Target group, needed by _deliver() during recovery. */
    groupTo: "user" | "manager";
    /** Read timestamp (ms), null until read. */
    readAt: number | null;
    /** Delivery channels with details: type, cost, and send time (actually sent). */
    channels: NotificationChannelEntry[];
    /** Channel types selected for delivery when the notification was created. */
    requestedChannels: string[];
    /**
     * Total cost of all channels through which the notification was sent.
     * Accumulates during delivery and escalation. 0 = free channels only.
     */
    spentCost: number;
    /** Log of all delivery attempts, escalations, and errors. */
    logs: NotificationLogEntry[];
    /**
     * Important message. Important notifications are not subject to the waterfall channel limit
     * (NOTIFICATION_MAX_CHANNELS_PER_MESSAGE); they escalate across all channels until success.
     */
    important: boolean;
    /**
     * Total number of channel delivery attempts (successful + failed),
     * accumulated during initial delivery and escalations. Used for the waterfall limit.
     */
    deliveryAttempts: number;
    badge: "info" | "error";
    createdAt: number;
    updatedAt: number;
};
type attributes = typeof attributes;
export interface NotificationRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
declare let Model: {
    beforeCreate(init: NotificationRecord, cb: (err?: string) => void): void;
    log(criteria: CriteriaQuery<NotificationRecord>, level: NotificationLogLevel, module: string, message: string, ...data: any[]): Promise<void>;
};
declare global {
    const Notification: typeof Model & ORMModel<NotificationRecord, "readAt" | "data" | "channels" | "requestedChannels" | "logs" | "spentCost" | "important" | "deliveryAttempts" | "notificationTypeKey" | "eventKey" | "context" | "maxDeliveryCost" | "scheduledAt" | "idempotencyKey">;
}
export {};
