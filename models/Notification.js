"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const NotificationLogHelper_1 = __importDefault(require("../libs/NotificationLogHelper"));
let attributes = {
    /** UUID generated in beforeCreate. Also used as the read token. */
    id: {
        type: "string",
    },
    user: {
        model: "user",
        required: false,
    },
    title: {
        type: "string",
    },
    body: {
        type: "string",
    },
    /** Arbitrary payload: { type, orderId, render, routing, ... } */
    data: "json",
    /**
     * Notification type key from the NOTIFICATION_TYPES catalog (when typed).
     * null means an untyped send, e.g. manual creation from the admin panel.
     */
    notificationTypeKey: {
        type: "string",
        allowNull: true,
    },
    /** Business event key (NotificationEventRegistry) that produced this notification. */
    eventKey: {
        type: "string",
        allowNull: true,
    },
    /**
     * Full business event context (order/user/store/...). Passed to the channel adapter,
     * which extracts the fields it needs (push-notifications.md "single contract").
     */
    context: "json",
    /**
     * Per-message delivery cost limit (from the type's maxDeliveryCost setting).
     * Takes priority over the global NOTIFICATION_MAX_COST_PER_MESSAGE.
     * null means the type limit is not set and the global fallback applies.
     */
    maxDeliveryCost: {
        type: "number",
        allowNull: true,
    },
    /**
     * Time (ms) before which delivery must not run (sendDelaySec).
     * null/past means deliver immediately. Future values are picked up by the delivery loop when due.
     */
    scheduledAt: {
        type: "number",
        allowNull: true,
    },
    /** Idempotency/correlation key for deduplication and scheduled-delivery cancellation. */
    idempotencyKey: {
        type: "string",
        allowNull: true,
    },
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
    },
    /** Target group, needed by _deliver() during recovery. */
    groupTo: {
        type: "string",
        isIn: ["user", "manager"],
        defaultsTo: "user",
    },
    /** Read timestamp (ms), null until read. */
    readAt: {
        type: "number",
        allowNull: true,
    },
    /** Delivery channels with details: type, cost, and send time (actually sent). */
    channels: "json",
    /** Channel types selected for delivery when the notification was created. */
    requestedChannels: "json",
    /**
     * Total cost of all channels through which the notification was sent.
     * Accumulates during delivery and escalation. 0 = free channels only.
     */
    spentCost: {
        type: "number",
        defaultsTo: 0,
    },
    /** Log of all delivery attempts, escalations, and errors. */
    logs: "json",
    /**
     * Important message. Important notifications are not subject to the waterfall channel limit
     * (NOTIFICATION_MAX_CHANNELS_PER_MESSAGE); they escalate across all channels until success.
     */
    important: {
        type: "boolean",
        defaultsTo: false,
    },
    /**
     * Total number of channel delivery attempts (successful + failed),
     * accumulated during initial delivery and escalations. Used for the waterfall limit.
     */
    deliveryAttempts: {
        type: "number",
        defaultsTo: 0,
    },
    /**
     * Terminal flag for the unread-escalation loop. Set when escalation can never proceed
     * for this record (channel limit reached / no remaining channels / device-targeted
     * notification without user). Once true, the record is excluded from the loop forever —
     * prevents endless rescans and unbounded `logs` growth.
     */
    escalationExhausted: {
        type: "boolean",
        defaultsTo: false,
    },
    badge: {
        type: "string",
        isIn: ["info", "error"],
        defaultsTo: "info",
    },
    // autoCreatedAt/autoUpdatedAt are required: without them Waterline leaves these
    // null, and the admin dashboard/history/activity (which query and sort by a time
    // window, default "today") render empty even though records exist.
    createdAt: {
        type: "number",
        autoCreatedAt: true,
    },
    updatedAt: {
        type: "number",
        autoUpdatedAt: true,
    },
};
let Model = {
    beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        cb();
    },
    async log(criteria, level, module, message, ...data) {
        return NotificationLogHelper_1.default.log(criteria, level, module, message, ...data);
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
