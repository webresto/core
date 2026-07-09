"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** UUID generated in beforeCreate. */
    id: {
        type: "string",
    },
    /** Business rule key (snake_case, unique), e.g. "order_accepted_push". */
    key: {
        type: "string",
        required: true,
        unique: true,
    },
    /** Human-readable name. */
    name: {
        type: "string",
        allowNull: true,
    },
    /** Purpose / when it triggers. */
    description: {
        type: "string",
        allowNull: true,
    },
    /** Event this rule reacts to (NotificationEventRegistry key). */
    eventKey: {
        type: "string",
        required: true,
    },
    /** Whether sending is enabled for this rule (registration does not mean sending). */
    enabled: {
        type: "boolean",
        defaultsTo: false,
    },
    priority: {
        type: "string",
        isIn: ["normal", "high", "critical"],
        defaultsTo: "normal",
    },
    /** Delay (seconds) before the first delivery attempt. Defaults to 0. */
    sendDelaySec: {
        type: "number",
        defaultsTo: 0,
    },
    /** Exempts the notification from the waterfall channel limit. */
    important: {
        type: "boolean",
        defaultsTo: false,
    },
    /** Per-rule delivery budget. null = not set (global fallback applies). */
    maxDeliveryCost: {
        type: "number",
        allowNull: true,
    },
    /** If true, ignore maxDeliveryCost and use the global NOTIFICATION_MAX_COST_PER_MESSAGE. */
    useGlobalFallback: {
        type: "boolean",
        defaultsTo: false,
    },
    channelsMode: {
        type: "string",
        isIn: ["waterfall", "fixed"],
        defaultsTo: "waterfall",
    },
    /**
     * Which acknowledgement stops the unread-escalation waterfall for this rule:
     *  - "read" (default) — escalate until the recipient actually opened it (readAt);
     *  - "delivered" — stop as soon as the device confirmed receipt (deliveredAt),
     *    even if the user has not looked at it yet. Web push reports delivery
     *    reliably; native apps can only ack on tap, so there "delivered" ≈ "read".
     */
    escalateBy: {
        type: "string",
        isIn: ["read", "delivered"],
        defaultsTo: "read",
    },
    /** Used only when channelsMode === "fixed". */
    fixedChannels: {
        type: "json",
        defaultsTo: [],
    },
    /** Preferred channels for starting the waterfall (channelsMode === "waterfall"). */
    defaultChannels: {
        type: "json",
        defaultsTo: [],
    },
    /** Templates: base + per-locale + channel-specific. */
    templates: {
        type: "json",
        defaultsTo: {},
    },
    // createdAt / updatedAt — auto-managed by Waterline (typed via the ORM base interface).
};
const KEY_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
/**
 * Validate a rule payload. Returns an array of human-readable errors (empty = valid).
 * Mirrors the lifecycle checks below so callers (controllers/MCP) can validate before write.
 */
function validateRule(rule) {
    const errors = [];
    const key = String(rule?.key || "").trim();
    if (!key) {
        errors.push("key is required");
    }
    else if (!KEY_REGEX.test(key)) {
        errors.push("key must be snake_case (lowercase, digits, underscores)");
    }
    if (!String(rule?.eventKey || "").trim()) {
        errors.push("eventKey is required");
    }
    if (rule?.sendDelaySec !== undefined && rule.sendDelaySec !== null) {
        const d = Number(rule.sendDelaySec);
        if (!Number.isFinite(d) || d < 0)
            errors.push("sendDelaySec must be a non-negative number");
    }
    if (rule?.maxDeliveryCost !== undefined && rule.maxDeliveryCost !== null) {
        const c = Number(rule.maxDeliveryCost);
        if (!Number.isFinite(c) || c < 0)
            errors.push("maxDeliveryCost must be null or a non-negative number");
    }
    if (rule?.channelsMode === "fixed" && (!Array.isArray(rule.fixedChannels) || rule.fixedChannels.length === 0)) {
        errors.push("fixedChannels must list at least one channel when channelsMode is 'fixed'");
    }
    if (rule?.escalateBy !== undefined && rule.escalateBy !== null && !["read", "delivered"].includes(String(rule.escalateBy))) {
        errors.push("escalateBy must be 'read' or 'delivered'");
    }
    return errors;
}
let Model = {
    beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        const errors = NotificationRules.validateRule(init);
        if (errors.length > 0)
            return cb(`Invalid notification rule: ${errors.join("; ")}`);
        cb();
    },
    beforeUpdate(values, cb) {
        // Validate only submitted fields: partial updates must not require key/eventKey,
        // but if they are provided, validate them; also validate ranges and fixed channels.
        const errors = validateRule({ ...values, key: values.key ?? "x", eventKey: values.eventKey ?? "x" })
            .filter((e) => {
            if (e.startsWith("key ") && values.key === undefined)
                return false;
            if (e.startsWith("eventKey ") && values.eventKey === undefined)
                return false;
            return true;
        });
        if (errors.length > 0)
            return cb(`Invalid notification rule: ${errors.join("; ")}`);
        cb();
    },
    /** Validate a rule payload (see {@link validateRule}). */
    validateRule(rule) {
        return validateRule(rule);
    },
    /**
     * Seed the example rules (mostly disabled — registration ≠ sending; e.g. `order_on_the_way_push`
     * ships enabled by default) when the catalog is empty. Replaces the old `NOTIFICATION_TYPES`
     * settings `defaultValue`. Templates for existing rows are handled on read by
     * `NotificationTypeRegistry` (parse + seed fallback), so no per-row backfill is needed here.
     */
    async seedDefaults() {
        const count = await NotificationRules.count();
        if (count > 0)
            return;
        const defaults = require("../seeds/notification_rules.json");
        for (const rule of defaults) {
            try {
                await NotificationRules.create(rule).fetch();
            }
            catch (error) {
                sails.log.warn(`[NotificationRules] Failed to seed default rule "${rule.key}":`, error);
            }
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
