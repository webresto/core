import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { SalesChannelRegistry } from "../libs/SalesChannelRegistry";
import type SalesChannelAdapter from "../adapters/sales-channel/SalesChannelAdapter";
import type { SalesChannelStatusResult } from "../adapters/sales-channel/SalesChannelAdapter";

/**
 * SalesChannel
 *
 * A configured backend client / entry point that can create orders for this project:
 * a concrete website storefront, messenger bot, kiosk, staff order-entry surface,
 * aggregator bridge, etc.
 *
 * Conceptually a SalesChannel IS a single client. The same client can run on several
 * runtime platforms (web, PWA, native iOS/Android app) — those go into the `platforms`
 * list of ONE channel, they do not each get their own SalesChannel record.
 *
 * Important vocabulary boundary:
 * - SalesChannel records are backend clients/integrations owned by the project.
 * - They are NOT low-level device/platform labels such as "web", "pwa-ios",
 *   "pwa-android", "ios", or "android" emitted by frontend runtimes.
 * - Those runtime labels may be useful diagnostics inside Order.orderedOnPlatform,
 *   but they should not create extra SalesChannel records when they are just modes
 *   of the same client storefront — list them in this channel's `platforms` instead.
 *
 * See ai-notes/sales-channels-research.md (§3.1 minimal model).
 *
 * The reusable *kind* of channel ("web-storefront", "telegram-bot", …) is described by
 * SalesChannelRegistry types; THIS model is the concrete enabled instance. The instance
 * `key` may be used as an Order.orderedOnPlatform source for orders coming from this
 * backend client.
 *
 * Channels come from provider modules. A module installed from the marketplace calls
 * `SalesChannel.alive(adapter)` on boot: core registers its type, creates the provider's
 * channel once (disabled, needs_setup) or adopts an existing record of that type, and asks
 * the adapter for readiness. The operator may add more channels of a type whose provider is
 * alive; a channel without a live provider never works. Readiness (`status`) is reported by
 * the provider only, `enabled` is the operator's switch — an ACTIVE channel is enabled,
 * ready and has a live provider. See ai-notes/sales-channels-research.md §8.2.
 */

export type SalesChannelManagedBy = "provider" | "operator";

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

  /**
   * Who created the record: "provider" — SalesChannel.alive() of the provider module (or an
   * adopted pre-existing record), "operator" — created by hand. Provider channels cannot be
   * deleted while the provider is installed; see removeProviderChannels() for uninstall.
   */
  managedBy: {
    type: "string",
    isIn: ["provider", "operator"],
    defaultsTo: "operator",
  } as unknown as SalesChannelManagedBy,

  /** Operator's switch. Only active channels (enabled + ready + live provider) take orders. */
  enabled: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  /**
   * Readiness reported by the provider (ready / needs_setup / error) — written only by
   * refreshStatus()/channelStatus(), never derived from `enabled`. draft/disabled remain
   * for records created before providers reported readiness.
   */
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

  /**
   * Runtime platform/device labels (e.g. "web", "pwa-android", "pwa-ios", "app-ios") that
   * report orders through this channel. An incoming Order.orderedOnPlatform value resolves
   * to this channel if it equals `key` OR appears in this list — one channel can cover
   * several runtime variants of the same backend client. A platform belongs to at most one
   * channel (enforced on save). Filled from the provider's defaults when alive() creates or
   * adopts the provider's channel with an empty list; otherwise set by the operator.
   */
  platforms: {
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

/** Live provider adapters registered on boot through alive() (channel type → adapter). */
let aliveSalesChannelAdapters = {} as { [type: string]: SalesChannelAdapter };

/** How long core waits for adapter.getStatus() before reporting the provider as silent. */
const STATUS_TIMEOUT_MS = 3000;
/** How long core waits for adapter.onChannelDeleted() before deleting the record anyway. */
const CLEANUP_TIMEOUT_MS = 10000;

const READINESS = ["ready", "needs_setup", "error"];

/**
 * Model defaults of the operator-owned fields. A provider channel whose fields still equal
 * these (and the adapter's `defaults`) counts as untouched and goes away with the module.
 */
const OPERATOR_FIELD_DEFAULTS: Record<string, unknown> = {
  countries: [],
  concepts: [],
  defaultConcept: null,
  allowConceptSwitch: true,
  settings: {},
  publicConfig: {},
  sortOrder: 0,
};

const TIMEOUT = Symbol("timeout");

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(TIMEOUT), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * PM2 cluster: adapters live in process memory, so every worker registers them, but only
 * worker 0 (or a plain process) writes channel records on boot — without a unique index a
 * findOrCreate per worker would create one channel per worker. Same rule as the
 * notification loops in hook/afterHook.ts.
 */
function isPrimaryWorker(): boolean {
  const instance = Number(process.env.NODE_APP_INSTANCE ?? 0);
  return !(Number.isFinite(instance) && instance > 0);
}

function providerOf(adapter: SalesChannelAdapter | undefined): string | null {
  return adapter?.InitSalesChannelAdapter?.type?.providerModule || null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string" && x.trim()).map((x: string) => x.trim()) : [];
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Ask the adapter, turning exceptions and timeouts into an `error` readiness. */
async function askProvider(adapter: SalesChannelAdapter, channel: SalesChannelRecord): Promise<SalesChannelStatusResult> {
  try {
    const result = await withTimeout(Promise.resolve(adapter.getStatus(channel)), STATUS_TIMEOUT_MS);
    if (!result || !READINESS.includes(result.status)) {
      return { status: "error", message: "Provider returned an unknown status" };
    }
    return result.message ? { status: result.status, message: String(result.message) } : { status: result.status };
  } catch (e) {
    if (e === TIMEOUT) return { status: "error", message: "Provider did not respond" };
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

/** Platforms from `wanted` that no other channel declares yet (a platform has one owner). */
async function freePlatforms(wanted: string[], exceptId: string | null): Promise<string[]> {
  const taken = new Set<string>();
  for (const channel of await SalesChannel.find({})) {
    if (exceptId && channel.id === exceptId) continue;
    for (const platform of stringList(channel.platforms)) taken.add(platform);
  }
  return stringList(wanted).filter((platform) => !taken.has(platform));
}

async function uniqueKey(base: string): Promise<string> {
  if (!(await SalesChannel.findOne({ key: base }))) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!(await SalesChannel.findOne({ key: candidate }))) return candidate;
  }
  return `${base}-${uuid().slice(0, 8)}`;
}

/**
 * Create the provider's channel once, or adopt a record of the same type + provider made
 * before the provider registered itself (by hand, or by admin-frontend 2.7.9–2.7.22 with
 * key "website"): the record with the provider's default key, else the earliest one. The
 * rest stay operator channels; nothing is deleted. Only `managedBy` and an empty
 * `platforms` list are touched on adoption.
 */
async function ensureProviderChannel(adapter: SalesChannelAdapter): Promise<void> {
  const { type: def, defaults } = adapter.InitSalesChannelAdapter;
  const type = def.type;
  const providerModule = providerOf(adapter);
  const sameType = await SalesChannel.find({ type, providerModule });
  if (sameType.some((channel) => channel.managedBy === "provider")) return;

  if (sameType.length) {
    const sorted = sameType
      .slice()
      .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0) || String(a.id).localeCompare(String(b.id)));
    const adopted = sorted.find((channel) => channel.key === defaults.key) || sorted[0];
    const values: Record<string, unknown> = { managedBy: "provider" };
    if (stringList(adopted.platforms).length === 0) {
      values.platforms = await freePlatforms(defaults.platforms, adopted.id);
    }
    await SalesChannel.updateOne({ id: adopted.id }, values);
    sails.log.info(`SalesChannel > alive: ${providerModule} adopted channel "${adopted.key}" of type ${type}`);
    return;
  }

  const values: any = {
    key: await uniqueKey(defaults.key || type),
    title: defaults.title || def.title,
    type,
    providerModule,
    managedBy: "provider",
    enabled: false,
    status: "needs_setup",
    platforms: await freePlatforms(defaults.platforms, null),
    url: defaults.url || null,
  };
  await SalesChannel.create(values).fetch();
  sails.log.info(`SalesChannel > alive: ${providerModule} created its channel of type ${type}`);
}

/**
 * Does the provider channel still look exactly as alive() would create it? Compared at
 * uninstall time instead of tracking edits: key/title/url/platforms against the adapter's
 * defaults, the rest against the model defaults. `enabled` is not compared — switching a
 * channel on and off is not an edit. No adapter → treated as edited (kept, the safe side).
 */
function isUntouchedProviderChannel(channel: SalesChannelRecord, adapter: SalesChannelAdapter | undefined): boolean {
  if (!adapter) return false;
  const defaults = adapter.InitSalesChannelAdapter.defaults;
  if (channel.key !== defaults.key) return false;
  if ((channel.title || "") !== (defaults.title || "")) return false;
  if ((channel.url || null) !== (defaults.url || null)) return false;
  if (!sameJson(stringList(channel.platforms).sort(), stringList(defaults.platforms).sort())) return false;
  return Object.entries(OPERATOR_FIELD_DEFAULTS).every(([field, value]) => sameJson((channel as any)[field] ?? value, value));
}

let Model = {
  beforeCreate(init: SalesChannelRecord, cb: (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }
    cb();
  },

  /**
   * Provider self-registration on boot (analogue of AuthProvider.alive). Registers the type
   * definition and keeps the adapter in memory in EVERY worker; creates/adopts the provider's
   * channel and stores its first status only in the primary worker. On later boots only
   * `status` is refreshed, and only when it changed — operator fields are never touched.
   *
   * One provider per type: if another module already registered an adapter for this type,
   * the call is refused with a warning (channels of a type are all served by one module).
   */
  async alive(adapter: SalesChannelAdapter): Promise<void> {
    const def = adapter?.InitSalesChannelAdapter?.type;
    const type = String(def?.type || "").trim();
    const providerModule = String(def?.providerModule || "").trim();
    if (!type || !providerModule || typeof adapter?.getStatus !== "function") {
      sails.log.warn(`SalesChannel > alive: adapter needs type.type, type.providerModule and getStatus() (${type || "no type"})`);
      return;
    }

    const current = aliveSalesChannelAdapters[type];
    if (current && providerOf(current) !== providerModule) {
      sails.log.warn(`SalesChannel > alive: type ${type} is already provided by module ${providerOf(current)}, ${providerModule} ignored`);
      return;
    }

    // The provider's definition replaces the core one, which drops `comingSoon`.
    SalesChannelRegistry.registerType({ ...def, type, providerModule, sourceModule: def.sourceModule || providerModule, comingSoon: false });
    aliveSalesChannelAdapters[type] = adapter;

    if (!isPrimaryWorker()) return;
    try {
      await ensureProviderChannel(adapter);
      await SalesChannel.refreshStatus(type);
    } catch (e) {
      sails.log.warn(`SalesChannel > alive: could not set up the channel of type ${type}`, e);
    }
  },

  /** Live adapter of a channel type (undefined if no provider registered it in this process). */
  getAdapter(type: string): SalesChannelAdapter | undefined {
    return aliveSalesChannelAdapters[String(type || "").trim()];
  },

  /** Channel types that currently have a live provider. */
  getAliveTypes(): string[] {
    return Object.keys(aliveSalesChannelAdapters);
  },

  /**
   * Active channel = enabled by the operator, provider alive, provider-reported `ready`.
   * Only active channels count as order sources, in the setup checklist and in widgets.
   * Reads the stored `status`; callers that need a fresh one call channelStatus() first.
   */
  isActive(channel: SalesChannelRecord | null | undefined): boolean {
    return Boolean(channel && channel.enabled === true && channel.status === "ready" && aliveSalesChannelAdapters[channel.type]);
  },

  /**
   * Fresh readiness of one channel from its provider. The result is stored only when the
   * provider answered (incl. throwing or timing out) and the value changed. "Provider did
   * not load" is computed on read and never stored.
   */
  async channelStatus(channel: SalesChannelRecord): Promise<SalesChannelStatusResult> {
    const adapter = aliveSalesChannelAdapters[channel?.type];
    if (!adapter) return { status: "error", message: "Provider did not load" };
    const result = await askProvider(adapter, channel);
    if (channel.status !== result.status) {
      try {
        await SalesChannel.updateOne({ id: channel.id }, { status: result.status });
        channel.status = result.status;
      } catch (e) {
        sails.log.warn(`SalesChannel > could not store status of channel ${channel.key}`, e);
      }
    }
    return result;
  },

  /**
   * Ask the provider about every channel of a type and store changed statuses. Called by
   * alive() on boot, by the admin read paths, and by providers after their own events
   * (admin-frontend: after a storefront build). Returns channel id → readiness.
   */
  async refreshStatus(type: string): Promise<Record<string, SalesChannelStatusResult>> {
    const channels = await SalesChannel.find({ type: String(type || "").trim() });
    const results = await Promise.all(channels.map((channel) => SalesChannel.channelStatus(channel)));
    const out: Record<string, SalesChannelStatusResult> = {};
    channels.forEach((channel, i) => { out[channel.id] = results[i]; });
    return out;
  },

  /** Delete a channel record, letting its provider clean up its side first. */
  async destroyChannel(channel: SalesChannelRecord): Promise<void> {
    const adapter = aliveSalesChannelAdapters[channel.type];
    if (adapter) {
      try {
        await withTimeout(Promise.resolve(adapter.onChannelDeleted(channel)), CLEANUP_TIMEOUT_MS);
      } catch (e) {
        sails.log.warn(`SalesChannel > onChannelDeleted failed for channel ${channel.key}`, e === TIMEOUT ? "timeout" : e);
      }
    }
    await SalesChannel.destroy({ id: channel.id }).fetch();
  },

  /**
   * The provider module is being uninstalled (app-manager remove action, before restart, so
   * the adapter is still loaded). Operator-created channels of the module and provider
   * channels nobody edited are deleted; an edited provider channel stays, disabled, and the
   * operator may delete it later. The module's adapters are dropped from memory.
   */
  async removeProviderChannels(appId: string): Promise<{ removed: string[]; disabled: string[] }> {
    const id = String(appId || "").trim();
    const removed: string[] = [];
    const disabled: string[] = [];
    if (!id) return { removed, disabled };

    for (const channel of await SalesChannel.find({ providerModule: id })) {
      const adapter = aliveSalesChannelAdapters[channel.type];
      const ownAdapter = providerOf(adapter) === id ? adapter : undefined;
      if (channel.managedBy === "provider" && !isUntouchedProviderChannel(channel, ownAdapter)) {
        if (channel.enabled) await SalesChannel.updateOne({ id: channel.id }, { enabled: false });
        disabled.push(channel.key);
      } else {
        await SalesChannel.destroyChannel(channel);
        removed.push(channel.key);
      }
    }

    for (const type of Object.keys(aliveSalesChannelAdapters)) {
      if (providerOf(aliveSalesChannelAdapters[type]) === id) delete aliveSalesChannelAdapters[type];
    }
    sails.log.info(`SalesChannel > provider ${id} removed: deleted [${removed.join(", ")}], kept disabled [${disabled.join(", ")}]`);
    return { removed, disabled };
  },

  /**
   * Which other channel already declares one of these platforms (a platform has one owner,
   * otherwise SalesChannel.resolve would attribute orders to whichever comes first).
   */
  async findPlatformOwner(platforms: string[], exceptId?: string | null): Promise<{ platform: string; channel: SalesChannelRecord } | null> {
    const wanted = stringList(platforms);
    if (!wanted.length) return null;
    for (const channel of await SalesChannel.find({})) {
      if (exceptId && channel.id === exceptId) continue;
      const platform = stringList(channel.platforms).find((p) => wanted.includes(p));
      if (platform) return { platform, channel };
    }
    return null;
  },

  /**
   * Resolve a channel by its public key, or by one of the runtime platforms it declares.
   * Returns the ACTIVE instance (see isActive) or null. Used to validate/normalize an
   * incoming order source.
   */
  async resolve(key: string): Promise<SalesChannelRecord | null> {
    const trimmed = String(key || "").trim();
    if (!trimmed) return null;
    const direct = await SalesChannel.findOne({ key: trimmed, enabled: true });
    if (direct && SalesChannel.isActive(direct)) return direct;
    const enabledChannels = await SalesChannel.find({ enabled: true });
    return (
      enabledChannels.find((channel) => {
        const platforms = (channel as any).platforms;
        return SalesChannel.isActive(channel) && Array.isArray(platforms) && platforms.includes(trimmed);
      }) || null
    );
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
      | "managedBy"
      | "enabled"
      | "status"
      | "countries"
      | "concepts"
      | "platforms"
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
