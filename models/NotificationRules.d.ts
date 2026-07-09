import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
/**
 * NotificationRules
 *
 * A notification *rule* (a.k.a. notification type) binds one business event (`eventKey`,
 * NotificationEventRegistry) to delivery configuration + templates. It is the persisted,
 * editable half of the typed-notifications model from `notifications-design-notes.md`:
 *  - maxDeliveryCost / useGlobalFallback — per-rule budget (§3);
 *  - sendDelaySec — delay before first send (§6);
 *  - channelsMode + fixedChannels/defaultChannels — channel selection (§4);
 *  - templates — base + per-locale + channel-specific (§1).
 *
 * Storage moved from the `NOTIFICATION_TYPES` Settings JSON to this model so critical
 * checks (snake_case key, eventKey, budget/delay ranges, fixed-channels) run in the model
 * lifecycle and the catalog gets normal DB semantics. `NotificationTypeRegistry` is the
 * read/cache facade over this model.
 */
export type NotificationPriority = "normal" | "high" | "critical";
export type NotificationChannelsMode = "waterfall" | "fixed";
export type NotificationEscalateBy = "read" | "delivered";
export interface NotificationTemplateContent {
    title?: string;
    body?: string;
    subject?: string;
    clickUrl?: string;
    [key: string]: string | undefined;
}
export interface NotificationRuleTemplates {
    /** Base template (fallback for everything) */
    default?: NotificationTemplateContent;
    /** Per-locale overrides, keyed by locale (e.g. "ru", "en") */
    locales?: Record<string, NotificationTemplateContent>;
    /**
     * Channel-specific overrides, keyed by channel type, then by locale or "default".
     * e.g. { "sms": { "default": {...}, "ru": {...} } }
     */
    channels?: Record<string, Record<string, NotificationTemplateContent>>;
}
declare let attributes: {
    /** UUID generated in beforeCreate. */
    id: string;
    /** Business rule key (snake_case, unique), e.g. "order_accepted_push". */
    key: string;
    /** Human-readable name. */
    name: string | null;
    /** Purpose / when it triggers. */
    description: string | null;
    /** Event this rule reacts to (NotificationEventRegistry key). */
    eventKey: string;
    /** Whether sending is enabled for this rule (registration does not mean sending). */
    enabled: boolean;
    priority: NotificationPriority;
    /** Delay (seconds) before the first delivery attempt. Defaults to 0. */
    sendDelaySec: number;
    /** Exempts the notification from the waterfall channel limit. */
    important: boolean;
    /** Per-rule delivery budget. null = not set (global fallback applies). */
    maxDeliveryCost: number | null;
    /** If true, ignore maxDeliveryCost and use the global NOTIFICATION_MAX_COST_PER_MESSAGE. */
    useGlobalFallback: boolean;
    channelsMode: NotificationChannelsMode;
    /**
     * Which acknowledgement stops the unread-escalation waterfall for this rule:
     *  - "read" (default) — escalate until the recipient actually opened it (readAt);
     *  - "delivered" — stop as soon as the device confirmed receipt (deliveredAt),
     *    even if the user has not looked at it yet. Web push reports delivery
     *    reliably; native apps can only ack on tap, so there "delivered" ≈ "read".
     */
    escalateBy: NotificationEscalateBy;
    /** Used only when channelsMode === "fixed". */
    fixedChannels: string[];
    /** Preferred channels for starting the waterfall (channelsMode === "waterfall"). */
    defaultChannels: string[];
    /** Templates: base + per-locale + channel-specific. */
    templates: NotificationRuleTemplates;
};
type attributes = typeof attributes;
export interface NotificationRulesRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
declare let Model: {
    beforeCreate(init: NotificationRulesRecord, cb: (err?: string) => void): void;
    beforeUpdate(values: Partial<NotificationRulesRecord>, cb: (err?: string) => void): void;
    /** Validate a rule payload (see {@link validateRule}). */
    validateRule(rule: Partial<NotificationRulesRecord>): string[];
    /**
     * Seed the example rules (mostly disabled — registration ≠ sending; e.g. `order_on_the_way_push`
     * ships enabled by default) when the catalog is empty. Replaces the old `NOTIFICATION_TYPES`
     * settings `defaultValue`. Templates for existing rows are handled on read by
     * `NotificationTypeRegistry` (parse + seed fallback), so no per-row backfill is needed here.
     */
    seedDefaults(): Promise<void>;
};
declare global {
    const NotificationRules: typeof Model & ORMModel<NotificationRulesRecord, "name" | "description" | "enabled" | "priority" | "sendDelaySec" | "important" | "maxDeliveryCost" | "useGlobalFallback" | "channelsMode" | "fixedChannels" | "defaultChannels" | "templates" | "escalateBy">;
}
export {};
