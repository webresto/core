/**
 * NotificationTypeRegistry
 *
 * Read/cache facade over the `NotificationRules` model (models/NotificationRules.ts), which
 * is the persisted catalog of notification *types* (delivery rules + templates).
 *
 * A type binds one event (`eventKey`) to delivery configuration:
 *  - maxDeliveryCost / useGlobalFallback — per-type budget (design notes §3);
 *  - sendDelaySec — delay before first send (§6);
 *  - channelsMode + fixedChannels/defaultChannels — channel selection (§4);
 *  - templates — base + per-locale + channel-specific (§1).
 *
 * Storage moved from the `NOTIFICATION_TYPES` Settings JSON to the model so critical checks
 * run in the model lifecycle. This facade keeps the in-memory cache (used by hot delivery
 * paths) and exposes the same getAll/get/getByEvent/upsert/remove API as before.
 */

import { NotificationRulesRecord } from "../models/NotificationRules";
import { NotificationEventRegistry } from "./NotificationEventRegistry";
import { UnknownVariable, validateTemplatePaths } from "./notificationContextSchema";

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

export interface NotificationTypeTemplates {
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

export interface NotificationType {
  key: string;
  name?: string;
  description?: string;
  /** Event this type reacts to (NotificationEventRegistry key) */
  eventKey: string;
  /** Whether sending is enabled for this type */
  enabled?: boolean;
  priority?: NotificationPriority;
  /** Delay (seconds) before first delivery attempt. Default 0. */
  sendDelaySec?: number;
  /** Exempts the notification from the waterfall channel limit. */
  important?: boolean;
  /** Per-type delivery budget. null = unset. */
  maxDeliveryCost?: number | null;
  /** If true, ignore maxDeliveryCost and use the global NOTIFICATION_MAX_COST_PER_MESSAGE fallback. */
  useGlobalFallback?: boolean;
  channelsMode?: NotificationChannelsMode;
  /**
   * Which ack stops the unread-escalation waterfall: "read" (default) — until the
   * recipient opened it (readAt); "delivered" — as soon as the device confirmed
   * receipt (deliveredAt), even if not read yet.
   */
  escalateBy?: NotificationEscalateBy;
  /** Only used when channelsMode === "fixed". */
  fixedChannels?: string[];
  /** Preferred channels to seed the waterfall (channelsMode === "waterfall"). */
  defaultChannels?: string[];
  templates?: NotificationTypeTemplates;
}

export type NotificationTypeMap = Record<string, NotificationType>;

const NOTIFICATION_TYPES_CACHE_GLOBAL_KEY = "__restoappNotificationTypesCache";

function getRulesModel(): typeof NotificationRules | null {
  try {
    if (typeof NotificationRules !== "undefined") return NotificationRules;
  } catch (_error) {
    // NotificationRules is a Sails model global, unavailable during early imports.
  }
  return null;
}

/**
 * The `templates`/`fixedChannels`/`defaultChannels` columns are physical `text` (the migration
 * predates Waterline auto-migration), while the model declares them `json`. Depending on the
 * adapter a value can come back as a JSON *string* instead of a parsed object/array — in which
 * case the old normalizer treated it as non-object and silently dropped it. Parse defensively.
 */
function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    return value;
  }
}

/** True when a template layer (default/locale/channel) carries any non-empty string. */
function isTemplateLayerFilled(layer: unknown): boolean {
  return !!layer && typeof layer === "object" && !Array.isArray(layer)
    && Object.values(layer as Record<string, unknown>).some((v) => typeof v === "string" && v.trim().length > 0);
}

/** A templates object with nothing renderable anywhere (base/locale/channel all empty). */
function templatesAreEmpty(templates: NotificationTypeTemplates): boolean {
  if (isTemplateLayerFilled(templates.default)) return false;
  if (templates.locales && Object.values(templates.locales).some(isTemplateLayerFilled)) return false;
  if (templates.channels) {
    for (const perType of Object.values(templates.channels)) {
      if (perType && typeof perType === "object" && Object.values(perType).some(isTemplateLayerFilled)) return false;
    }
  }
  return true;
}

/** Lazy map of seed templates keyed by rule key, for the "empty → fall back to seed" rule. */
let seedTemplatesByKey: Record<string, NotificationTypeTemplates> | null = null;
function getSeedTemplates(key: string): NotificationTypeTemplates | null {
  if (!seedTemplatesByKey) {
    seedTemplatesByKey = {};
    try {
      const seed = require("../seeds/notification_rules.json") as Array<{ key?: string; templates?: NotificationTypeTemplates }>;
      for (const rule of seed) {
        if (rule && rule.key) seedTemplatesByKey[rule.key] = rule.templates || {};
      }
    } catch (_error) {
      // seed file unavailable — fall back to no defaults.
    }
  }
  return seedTemplatesByKey[key] || null;
}

function getCache(): NotificationTypeMap {
  const globalScope = globalThis as any;
  if (!globalScope[NOTIFICATION_TYPES_CACHE_GLOBAL_KEY]) {
    globalScope[NOTIFICATION_TYPES_CACHE_GLOBAL_KEY] = {};
  }
  return globalScope[NOTIFICATION_TYPES_CACHE_GLOBAL_KEY] as NotificationTypeMap;
}

function setCache(map: NotificationTypeMap): void {
  (globalThis as any)[NOTIFICATION_TYPES_CACHE_GLOBAL_KEY] = map;
}

export class NotificationTypeRegistry {
  /** Coerce a raw record/object into a clean NotificationType (or null if invalid). */
  private static normalizeType(raw: unknown): NotificationType | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, any>;
    const typeKey = String(r.key || "").trim();
    if (!typeKey) return null;
    const eventKey = String(r.eventKey || "").trim();

    const sendDelaySec = Number(r.sendDelaySec);
    const maxDeliveryCost = r.maxDeliveryCost === null || r.maxDeliveryCost === undefined
      ? null
      : Number(r.maxDeliveryCost);

    const fixedChannels = parseMaybeJson(r.fixedChannels);
    const defaultChannels = parseMaybeJson(r.defaultChannels);

    // Templates: parse (json-over-text columns can arrive as strings), then fall back to the
    // seed when nothing is renderable — so an operator never faces a blank template and delivery
    // always has something to send. Operator-authored templates are kept as-is.
    let templates = NotificationTypeRegistry.normalizeTemplates(parseMaybeJson(r.templates));
    if (templatesAreEmpty(templates)) {
      const seedTemplates = getSeedTemplates(typeKey);
      if (seedTemplates) templates = NotificationTypeRegistry.normalizeTemplates(seedTemplates);
    }

    return {
      key: typeKey,
      name: r.name ? String(r.name) : typeKey,
      description: r.description ? String(r.description) : undefined,
      eventKey,
      enabled: r.enabled === true,
      priority: ["normal", "high", "critical"].includes(r.priority) ? r.priority : "normal",
      sendDelaySec: Number.isFinite(sendDelaySec) && sendDelaySec > 0 ? Math.floor(sendDelaySec) : 0,
      important: r.important === true,
      maxDeliveryCost: maxDeliveryCost !== null && Number.isFinite(maxDeliveryCost) ? maxDeliveryCost : null,
      useGlobalFallback: r.useGlobalFallback === true,
      channelsMode: r.channelsMode === "fixed" ? "fixed" : "waterfall",
      escalateBy: r.escalateBy === "delivered" ? "delivered" : "read",
      fixedChannels: Array.isArray(fixedChannels)
        ? fixedChannels.map((c: any) => String(c || "").trim()).filter(Boolean)
        : [],
      defaultChannels: Array.isArray(defaultChannels)
        ? defaultChannels.map((c: any) => String(c || "").trim()).filter(Boolean)
        : [],
      templates,
    };
  }

  /** Coerce a raw list/map of records into a clean NotificationTypeMap. */
  static normalize(value: unknown): NotificationTypeMap {
    const list = Array.isArray(value)
      ? value
      : (value && typeof value === "object" ? Object.values(value as Record<string, unknown>) : []);
    const result: NotificationTypeMap = {};
    for (const raw of list) {
      const type = NotificationTypeRegistry.normalizeType(raw);
      if (type) result[type.key] = type;
    }
    return result;
  }

  private static normalizeTemplates(raw: unknown): NotificationTypeTemplates {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { default: {}, locales: {}, channels: {} };
    }
    const r = raw as Record<string, any>;
    return {
      default: r.default && typeof r.default === "object" ? r.default : {},
      locales: r.locales && typeof r.locales === "object" && !Array.isArray(r.locales) ? r.locales : {},
      channels: r.channels && typeof r.channels === "object" && !Array.isArray(r.channels) ? r.channels : {},
    };
  }

  /**
   * Validate a single type. Returns an array of human-readable errors (empty = valid).
   * Delegates to the model's check when available, with a self-contained fallback for
   * pre-boot callers (smoke tests).
   */
  static validate(type: Partial<NotificationType>): string[] {
    const model = getRulesModel();
    if (model && typeof model.validateRule === "function") {
      return model.validateRule(type as Partial<NotificationRulesRecord>);
    }
    const errors: string[] = [];
    const key = String(type?.key || "").trim();
    if (!key) {
      errors.push("key is required");
    } else if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(key)) {
      errors.push("key must be snake_case (lowercase, digits, underscores)");
    }
    if (!String(type?.eventKey || "").trim()) {
      errors.push("eventKey is required");
    }
    if (type?.sendDelaySec !== undefined && type.sendDelaySec !== null) {
      const d = Number(type.sendDelaySec);
      if (!Number.isFinite(d) || d < 0) errors.push("sendDelaySec must be a non-negative number");
    }
    if (type?.maxDeliveryCost !== undefined && type.maxDeliveryCost !== null) {
      const c = Number(type.maxDeliveryCost);
      if (!Number.isFinite(c) || c < 0) errors.push("maxDeliveryCost must be null or a non-negative number");
    }
    if (type?.channelsMode === "fixed" && (!Array.isArray(type.fixedChannels) || type.fixedChannels.length === 0)) {
      errors.push("fixedChannels must list at least one channel when channelsMode is 'fixed'");
    }
    if (type?.escalateBy !== undefined && type.escalateBy !== null && !["read", "delivered"].includes(String(type.escalateBy))) {
      errors.push("escalateBy must be 'read' or 'delivered'");
    }
    return errors;
  }

  /**
   * Soft-check a type's templates against its event's context schema. Returns unknown
   * `{{path}}` findings (never throws, never blocks saving). Empty when the event has no
   * schema or all paths resolve. Surfaced as warnings in the UI / API response.
   */
  static checkTemplateVariables(type: Partial<NotificationType>): UnknownVariable[] {
    const eventKey = String(type?.eventKey || "").trim();
    if (!eventKey) return [];
    const event = NotificationEventRegistry.getEvent(eventKey);
    if (!event?.contextSchema) return [];
    return validateTemplatePaths(type.templates, event.contextSchema);
  }

  // ─── Persistence (model-backed) ──────────────────────────────────────────

  /** Load the catalog from the NotificationRules model into the in-memory cache. Seeds defaults if empty. */
  static async load(): Promise<NotificationTypeMap> {
    const model = getRulesModel();
    if (!model) return getCache();

    if (typeof model.seedDefaults === "function") {
      await model.seedDefaults();
    }
    const records = await model.find();
    const normalized = NotificationTypeRegistry.normalize(records);
    setCache(normalized);
    return normalized;
  }

  /** Refresh the cache from the model (call after a write). */
  private static async refresh(): Promise<void> {
    const model = getRulesModel();
    if (!model) return;
    const records = await model.find();
    setCache(NotificationTypeRegistry.normalize(records));
  }

  // ─── Reads (use cache; call load() first on boot) ──────────────────────────

  static getAll(): NotificationType[] {
    return Object.values(getCache());
  }

  static get(key: string): NotificationType | null {
    return getCache()[String(key || "").trim()] || null;
  }

  /** Enabled types bound to the given event. */
  static getByEvent(eventKey: string): NotificationType[] {
    const key = String(eventKey || "").trim();
    return Object.values(getCache()).filter((t) => t.enabled && t.eventKey === key);
  }

  // ─── Writes (model-backed; model lifecycle enforces the critical checks) ────

  /** Create or update a type. Throws on validation failure. */
  static async upsert(type: NotificationType): Promise<NotificationType> {
    const errors = NotificationTypeRegistry.validate(type);
    if (errors.length > 0) {
      throw new Error(`Invalid notification type: ${errors.join("; ")}`);
    }
    const model = getRulesModel();
    if (!model) throw new Error("NotificationRules model is unavailable");

    const normalized = NotificationTypeRegistry.normalizeType(type);
    if (!normalized) throw new Error("Invalid notification type");

    const existing = await model.findOne({ key: normalized.key });
    if (existing) {
      await model.updateOne({ id: existing.id }).set(normalized as any);
    } else {
      await model.create(normalized as any).fetch();
    }
    await NotificationTypeRegistry.refresh();
    return NotificationTypeRegistry.get(normalized.key) || normalized;
  }

  static async remove(key: string): Promise<boolean> {
    const typeKey = String(key || "").trim();
    const model = getRulesModel();
    if (!model) return false;
    const existing = await model.findOne({ key: typeKey });
    if (!existing) return false;
    await model.destroy({ id: existing.id }).fetch();
    await NotificationTypeRegistry.refresh();
    return true;
  }
}
