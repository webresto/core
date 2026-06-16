import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
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

let attributes = {

  /** UUID generated in beforeCreate. */
  id: {
    type: "string",
  } as unknown as string,

  /** Business rule key (snake_case, unique), e.g. "order_accepted_push". */
  key: {
    type: "string",
    required: true,
    unique: true,
  } as unknown as string,

  /** Human-readable name. */
  name: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** Purpose / when it triggers. */
  description: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** Event this rule reacts to (NotificationEventRegistry key). */
  eventKey: {
    type: "string",
    required: true,
  } as unknown as string,

  /** Whether sending is enabled for this rule (registration does not mean sending). */
  enabled: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  priority: {
    type: "string",
    isIn: ["normal", "high", "critical"],
    defaultsTo: "normal",
  } as unknown as NotificationPriority,

  /** Delay (seconds) before the first delivery attempt. Defaults to 0. */
  sendDelaySec: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** Exempts the notification from the waterfall channel limit. */
  important: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  /** Per-rule delivery budget. null = not set (global fallback applies). */
  maxDeliveryCost: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** If true, ignore maxDeliveryCost and use the global NOTIFICATION_MAX_COST_PER_MESSAGE. */
  useGlobalFallback: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  channelsMode: {
    type: "string",
    isIn: ["waterfall", "fixed"],
    defaultsTo: "waterfall",
  } as unknown as NotificationChannelsMode,

  /** Used only when channelsMode === "fixed". */
  fixedChannels: {
    type: "json",
    defaultsTo: [],
  } as unknown as string[],

  /** Preferred channels for starting the waterfall (channelsMode === "waterfall"). */
  defaultChannels: {
    type: "json",
    defaultsTo: [],
  } as unknown as string[],

  /** Templates: base + per-locale + channel-specific. */
  templates: {
    type: "json",
    defaultsTo: {},
  } as unknown as NotificationRuleTemplates,

  // createdAt / updatedAt — auto-managed by Waterline (typed via the ORM base interface).
};

type attributes = typeof attributes;
/**
 * @deprecated use `NotificationRulesRecord` instead
 */
interface NotificationRules extends RequiredField<OptionalAll<attributes>, null>, ORM {}
export interface NotificationRulesRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {}

const KEY_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

/**
 * Validate a rule payload. Returns an array of human-readable errors (empty = valid).
 * Mirrors the lifecycle checks below so callers (controllers/MCP) can validate before write.
 */
function validateRule(rule: Partial<NotificationRulesRecord>): string[] {
  const errors: string[] = [];
  const key = String(rule?.key || "").trim();
  if (!key) {
    errors.push("key is required");
  } else if (!KEY_REGEX.test(key)) {
    errors.push("key must be snake_case (lowercase, digits, underscores)");
  }
  if (!String(rule?.eventKey || "").trim()) {
    errors.push("eventKey is required");
  }
  if (rule?.sendDelaySec !== undefined && rule.sendDelaySec !== null) {
    const d = Number(rule.sendDelaySec);
    if (!Number.isFinite(d) || d < 0) errors.push("sendDelaySec must be a non-negative number");
  }
  if (rule?.maxDeliveryCost !== undefined && rule.maxDeliveryCost !== null) {
    const c = Number(rule.maxDeliveryCost);
    if (!Number.isFinite(c) || c < 0) errors.push("maxDeliveryCost must be null or a non-negative number");
  }
  if (rule?.channelsMode === "fixed" && (!Array.isArray(rule.fixedChannels) || rule.fixedChannels.length === 0)) {
    errors.push("fixedChannels must list at least one channel when channelsMode is 'fixed'");
  }
  return errors;
}

let Model = {
  beforeCreate(init: NotificationRulesRecord, cb: (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }
    const errors = NotificationRules.validateRule(init);
    if (errors.length > 0) return cb(`Invalid notification rule: ${errors.join("; ")}`);
    cb();
  },

  beforeUpdate(values: Partial<NotificationRulesRecord>, cb: (err?: string) => void) {
    // Validate only submitted fields: partial updates must not require key/eventKey,
    // but if they are provided, validate them; also validate ranges and fixed channels.
    const errors = validateRule({ ...values, key: values.key ?? "x", eventKey: values.eventKey ?? "x" })
      .filter((e) => {
        if (e.startsWith("key ") && values.key === undefined) return false;
        if (e.startsWith("eventKey ") && values.eventKey === undefined) return false;
        return true;
      });
    if (errors.length > 0) return cb(`Invalid notification rule: ${errors.join("; ")}`);
    cb();
  },

  /** Validate a rule payload (see {@link validateRule}). */
  validateRule(rule: Partial<NotificationRulesRecord>): string[] {
    return validateRule(rule);
  },

  /**
   * Seed the example rules (mostly disabled — registration ≠ sending; e.g. `order_on_the_way_push`
   * ships enabled by default) when the catalog is empty. Replaces the old `NOTIFICATION_TYPES`
   * settings `defaultValue`. Templates for existing rows are handled on read by
   * `NotificationTypeRegistry` (parse + seed fallback), so no per-row backfill is needed here.
   */
  async seedDefaults(): Promise<void> {
    const count = await NotificationRules.count();
    if (count > 0) return;
    const defaults = require("../seeds/notification_rules.json") as Array<Partial<NotificationRulesRecord> & { key: string; eventKey: string }>;
    for (const rule of defaults) {
      try {
        await NotificationRules.create(rule as any).fetch();
      } catch (error) {
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

declare global {
  const NotificationRules: typeof Model & ORMModel<NotificationRulesRecord, "name" | "description" | "enabled" | "priority" | "sendDelaySec" | "important" | "maxDeliveryCost" | "useGlobalFallback" | "channelsMode" | "fixedChannels" | "defaultChannels" | "templates">;
}
