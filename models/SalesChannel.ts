import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";

/**
 * SalesChannel
 *
 * A configured backend client / entry point that can create orders for this project:
 * a concrete website storefront, messenger bot, kiosk, staff order-entry surface,
 * aggregator bridge, etc.
 *
 * Important vocabulary boundary:
 * - SalesChannel records are backend clients/integrations owned by the project.
 * - They are NOT low-level device/platform labels such as "web", "pwa-ios",
 *   "pwa-android", "ios", or "android" emitted by frontend runtimes.
 * - Those runtime labels may be useful diagnostics inside Order.orderedOnPlatform,
 *   but they should not create extra SalesChannel records when they are just modes
 *   of the same client storefront.
 *
 * See ai-notes/sales-channels-research.md (§3.1 minimal model).
 *
 * The reusable *kind* of channel ("web-storefront", "telegram-bot", …) is described by
 * SalesChannelRegistry types; THIS model is the concrete enabled instance. The instance
 * `key` may be used as an Order.orderedOnPlatform source for orders coming from this
 * backend client.
 */

export type SalesChannelStatus =
  | "draft"        // created, not yet configured/enabled
  | "needs_setup"  // enabled but missing required settings
  | "ready"        // enabled and configured
  | "disabled"     // intentionally turned off
  | "error";       // provider/health check failed

let attributes = {
  /** UUID generated in beforeCreate. */
  id: {
    type: "string",
  } as unknown as string,

  /**
   * Stable slug for this backend client. This is distinct from runtime platform strings
   * like "web", "pwa-ios", or "android". Uniqueness is enforced in the upsert controller
   * (mirrors the promo-code precedent — no DB unique constraint/migration).
   */
  key: {
    type: "string",
  } as unknown as string,

  /** Human-readable name, e.g. "Main website", "Telegram delivery bot". */
  title: {
    type: "string",
  } as unknown as string,

  /**
   * Channel type slug from SalesChannelRegistry: web-storefront, telegram-bot,
   * admin-front-site, custom, legacy (for backfilled values), …
   */
  type: {
    type: "string",
    defaultsTo: "custom",
  } as unknown as string,

  /** appId of the module that provides this type. null for custom/manual channels. */
  providerModule: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** Master switch. Only enabled channels are valid order sources / shown as ready. */
  enabled: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  /** Lifecycle/readiness state surfaced in the admin UI. */
  status: {
    type: "string",
    isIn: ["draft", "needs_setup", "ready", "disabled", "error"],
    defaultsTo: "draft",
  } as unknown as SalesChannelStatus,

  /** ISO 3166-1 alpha-2 codes where this instance is intended to run. */
  countries: {
    type: "json",
    defaultsTo: [],
  } as unknown as string[],

  /** Concept allowlist. Empty array = all concepts (doc §6.2). */
  concepts: {
    type: "json",
    defaultsTo: [],
  } as unknown as string[],

  /** Default concept this channel writes into orders, when set. */
  defaultConcept: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** Whether the frontend/bot may expose a concept selector when multiple are bound. */
  allowConceptSwitch: {
    type: "boolean",
    defaultsTo: true,
  } as unknown as boolean,

  /** Public URL / deep-link for the channel (storefront URL, bot link, …). */
  url: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  /** Instance-level NON-secret configuration choices (doc §8.3). */
  settings: {
    type: "json",
    defaultsTo: {},
  } as unknown as Record<string, unknown>,

  /** Config safe to expose to public frontends/bots. */
  publicConfig: {
    type: "json",
    defaultsTo: {},
  } as unknown as Record<string, unknown>,

  /** References to Settings/env where secrets live — NOT raw secrets (doc §8.3, §13). */
  secretsRef: {
    type: "json",
    defaultsTo: {},
  } as unknown as Record<string, unknown>,

  sortOrder: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  // autoCreatedAt/autoUpdatedAt as numbers — matches Notification so admin time-window
  // queries/sorts behave consistently.
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
interface SalesChannel extends RequiredField<OptionalAll<attributes>, null>, ORM {}
export interface SalesChannelRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {}

let Model = {
  beforeCreate(init: SalesChannelRecord, cb: (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }
    cb();
  },

  /**
   * Resolve a channel by its public key. Returns the ENABLED instance or null.
   * Used to validate/normalize an incoming order source.
   */
  async resolve(key: string): Promise<SalesChannelRecord | null> {
    const trimmed = String(key || "").trim();
    if (!trimmed) return null;
    const channel = await SalesChannel.findOne({ key: trimmed, enabled: true });
    return channel || null;
  },

  /**
   * Normalize an order-source value (doc §16 step 3 / §15 open question → warn-only).
   *
   * Backward compatible: returns the SAME string it was given (never throws). When the
   * value does not match a known enabled channel it only logs a warning, so legacy
   * frontends/bots keep working during the transition.
   */
  async normalizePlatform(key: string | null | undefined): Promise<string | null> {
    if (key === undefined || key === null) return null as any;
    const trimmed = String(key).trim();
    if (!trimmed) return trimmed;
    try {
      const channel = await SalesChannel.resolve(trimmed);
      if (!channel) {
        sails.log.warn(
          `SalesChannel > order source "${trimmed}" does not match an enabled sales channel — accepted for backward compatibility`
        );
      }
    } catch (e) {
      // Resolution is best-effort; never block the order.
      sails.log.warn("SalesChannel > normalizePlatform failed", e);
    }
    return trimmed;
  },

  /**
   * Idempotent boot-time backfill (doc §14). This is legacy-only migration glue: when
   * the table is empty, mirror distinct historical Order.orderedOnPlatform values into
   * type "legacy" records so old reports/frontends keep working. Do not use this as the
   * conceptual model for new runtime platform labels; new SalesChannel rows should model
   * backend clients/integrations.
   */
  async backfillFromOrders(): Promise<void> {
    try {
      const existing = await SalesChannel.count();
      if (existing > 0) return;

      const orders = await Order.find({ where: { orderedOnPlatform: { "!=": null } } });

      const keys = new Set<string>();
      for (const order of orders) {
        const value = String((order as any).orderedOnPlatform || "").trim();
        if (value) keys.add(value);
      }

      if (keys.size === 0) return;

      let sortOrder = 0;
      for (const key of keys) {
        await SalesChannel.findOrCreate(
          { key },
          {
            key,
            title: key,
            type: "legacy",
            providerModule: null,
            enabled: true,
            status: "ready",
            sortOrder: sortOrder++,
          }
        );
      }
      sails.log.info(`SalesChannel > backfilled ${keys.size} legacy channel(s) from existing orders`);
    } catch (e) {
      sails.log.warn("SalesChannel > backfillFromOrders failed", e);
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const SalesChannel: typeof Model &
    ORMModel<
      SalesChannelRecord,
      | "providerModule"
      | "enabled"
      | "status"
      | "countries"
      | "concepts"
      | "defaultConcept"
      | "allowConceptSwitch"
      | "url"
      | "settings"
      | "publicConfig"
      | "secretsRef"
      | "sortOrder"
      | "type"
    >;
}
