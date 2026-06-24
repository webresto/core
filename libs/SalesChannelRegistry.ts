/**
 * SalesChannelRegistry
 *
 * In-memory catalog of sales-channel *types* (the reusable kinds of channel: web-storefront,
 * telegram-bot, line-oa, …) plus a country → recommended-types matrix. See
 * ai-notes/sales-channels-research.md (§2 vocabulary, §3.2 type registry, §5 region recs).
 *
 * Design mirrors SetupChecklistRegistry / NotificationEventRegistry:
 *  - Definitions live ONLY in RAM, on a globalThis singleton (survives hot-reload).
 *  - core registers its defaults via registerCoreDefaults() (called from hook/afterHook.ts);
 *    channel-provider modules register their own types from their boot hook.
 *  - This registry never touches the DB. Configured instances are SalesChannel records.
 */

export type SalesChannelCategory =
  | "storefront"
  | "messenger"
  | "staff"
  | "kiosk"
  | "aggregator"
  | "mobile"
  | "social"
  | "custom";

/** Capabilities a channel type can declare (doc §4). */
export type SalesChannelCapability =
  | "orders:create"
  | "orders:update"
  | "orders:pay"
  | "orders:status"
  | "menu:browse"
  | "menu:concept-filter"
  | "customers:identify"
  | "customers:anonymous"
  | "notifications:reply"
  | "webhooks:incoming"
  | "assets:frontend"
  | "admin:order-entry";

export interface SalesChannelTypeDefinition {
  /** Stable type slug, e.g. "line-oa". */
  type: string;
  /** Human-readable title, e.g. "LINE Official Account". */
  title: string;
  category: SalesChannelCategory;
  /** appId of the module that supplies this type (null for core-conceptual types). */
  providerModule?: string | null;
  /** Marketplace appId to install the provider, when it is an installable module. */
  marketplaceAppId?: string | null;
  /** ISO 3166-1 alpha-2 codes where this type is most relevant. */
  countries?: string[];
  capabilities?: SalesChannelCapability[];
  supportsConcepts?: boolean;
  supportsMultipleInstances?: boolean;
  /** Material icon name for the admin UI. */
  icon?: string;
  /** Module that registered the type (diagnostics): "core", "sales-channel-line", … */
  sourceModule?: string;
}

const TYPES_GLOBAL_KEY = "__restoappSalesChannelTypes";
const REGION_GLOBAL_KEY = "__restoappSalesChannelRegions";

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getTypes(): Map<string, SalesChannelTypeDefinition> {
  const g = globalThis as any;
  if (!(g[TYPES_GLOBAL_KEY] instanceof Map)) {
    g[TYPES_GLOBAL_KEY] = new Map<string, SalesChannelTypeDefinition>();
  }
  return g[TYPES_GLOBAL_KEY];
}

function getRegionMatrix(): Record<string, string[]> {
  const g = globalThis as any;
  if (!g[REGION_GLOBAL_KEY]) {
    g[REGION_GLOBAL_KEY] = {};
  }
  return g[REGION_GLOBAL_KEY];
}

function warn(message: string, err?: unknown): void {
  try {
    if (err !== undefined) sails.log.warn(`[SalesChannelRegistry] ${message}`, err);
    else sails.log.warn(`[SalesChannelRegistry] ${message}`);
  } catch (_e) {
    // sails may be unavailable during early import / pre-boot
  }
}

function normalizeKey(value: unknown): string {
  return String(value || "").trim();
}

export class SalesChannelRegistry {
  // ─── Writes ────────────────────────────────────────────────────────────────

  /** Register (or overwrite) a channel type. Idempotent on `type` (hot-reload safe). */
  static registerType(def: SalesChannelTypeDefinition): void {
    const type = normalizeKey(def?.type);
    if (!type) return warn("registerType called without a type");
    if (!KEY_RE.test(type)) warn(`type "${type}" is not a kebab-case slug`);
    getTypes().set(type, {
      ...def,
      type,
      providerModule: def.providerModule ?? null,
      countries: Array.isArray(def.countries) ? def.countries : [],
      capabilities: Array.isArray(def.capabilities) ? def.capabilities : [],
      supportsConcepts: def.supportsConcepts ?? true,
      supportsMultipleInstances: def.supportsMultipleInstances ?? true,
    });
  }

  static registerTypes(defs: SalesChannelTypeDefinition[]): void {
    if (!Array.isArray(defs)) return;
    for (const def of defs) SalesChannelRegistry.registerType(def);
  }

  static unregisterType(type: string): boolean {
    return getTypes().delete(normalizeKey(type));
  }

  /** Merge a country → recommended-type-slugs map into the region matrix. */
  static registerRegionRecommendations(matrix: Record<string, string[]>): void {
    if (!matrix || typeof matrix !== "object") return;
    const target = getRegionMatrix();
    for (const [country, types] of Object.entries(matrix)) {
      if (Array.isArray(types)) target[String(country).toUpperCase()] = types.slice();
    }
  }

  // ─── Reads ───────────────────────────────────────────────────────────────────

  static listTypes(): SalesChannelTypeDefinition[] {
    return Array.from(getTypes().values()).sort((a, b) => a.type.localeCompare(b.type));
  }

  static getType(type: string): SalesChannelTypeDefinition | null {
    return getTypes().get(normalizeKey(type)) || null;
  }

  /**
   * Ordered list of recommended type slugs for a country (doc §5). Falls back to the "*"
   * default profile. Recommendations are discovery hints, never a hard rule.
   */
  static recommendForCountry(iso?: string | null): string[] {
    const matrix = getRegionMatrix();
    const code = normalizeKey(iso).toUpperCase();
    const list = (code && matrix[code]) || matrix["*"] || [];
    return list.slice();
  }

  /** Recommended type DEFINITIONS for a country (resolved against registered types). */
  static recommendedTypesForCountry(iso?: string | null): SalesChannelTypeDefinition[] {
    return SalesChannelRegistry.recommendForCountry(iso)
      .map((type) => SalesChannelRegistry.getType(type))
      .filter((def): def is SalesChannelTypeDefinition => Boolean(def));
  }

  // ─── Core defaults ─────────────────────────────────────────────────────────

  /** Register the channel types + region matrix that ship with core. Called from afterHook. */
  static registerCoreDefaults(): void {
    this.registerTypes([
      {
        type: "web-storefront",
        title: "Web storefront",
        category: "storefront",
        providerModule: "base-storefront",
        marketplaceAppId: "base-storefront",
        icon: "language",
        capabilities: ["orders:create", "orders:pay", "orders:status", "menu:browse", "menu:concept-filter", "customers:anonymous", "assets:frontend"],
        sourceModule: "core",
      },
      {
        type: "admin-front-site",
        title: "Staff order-entry website",
        category: "staff",
        providerModule: "admin-frontend",
        marketplaceAppId: "admin-frontend",
        icon: "support_agent",
        capabilities: ["orders:create", "admin:order-entry", "menu:browse"],
        supportsMultipleInstances: false,
        sourceModule: "core",
      },
      {
        type: "telegram-bot",
        title: "Telegram bot",
        category: "messenger",
        providerModule: "sales-channel-telegram",
        marketplaceAppId: "sales-channel-telegram",
        countries: ["RU", "BY", "KZ"],
        icon: "send",
        capabilities: ["orders:create", "menu:browse", "customers:identify", "notifications:reply", "webhooks:incoming"],
        sourceModule: "core",
      },
      {
        type: "vk-miniapp",
        title: "VK mini app",
        category: "social",
        providerModule: "sales-channel-vk",
        marketplaceAppId: "sales-channel-vk",
        countries: ["RU", "BY"],
        icon: "groups",
        capabilities: ["orders:create", "menu:browse", "customers:identify"],
        sourceModule: "core",
      },
      {
        type: "max-bot",
        title: "MAX bot",
        category: "messenger",
        providerModule: "sales-channel-max",
        marketplaceAppId: "sales-channel-max",
        countries: ["RU"],
        icon: "chat",
        capabilities: ["orders:create", "menu:browse", "customers:identify", "webhooks:incoming"],
        sourceModule: "core",
      },
      {
        type: "line-oa",
        title: "LINE Official Account",
        category: "messenger",
        providerModule: "sales-channel-line",
        marketplaceAppId: "sales-channel-line",
        countries: ["TH", "JP", "TW"],
        icon: "forum",
        capabilities: ["orders:create", "menu:browse", "customers:identify", "notifications:reply", "webhooks:incoming"],
        sourceModule: "core",
      },
      {
        type: "zalo-oa",
        title: "Zalo Official Account",
        category: "messenger",
        providerModule: "sales-channel-zalo",
        marketplaceAppId: "sales-channel-zalo",
        countries: ["VN"],
        icon: "forum",
        capabilities: ["orders:create", "menu:browse", "customers:identify", "webhooks:incoming"],
        sourceModule: "core",
      },
      {
        type: "whatsapp-business",
        title: "WhatsApp Business",
        category: "messenger",
        providerModule: "sales-channel-whatsapp",
        marketplaceAppId: "sales-channel-whatsapp",
        icon: "chat_bubble",
        capabilities: ["orders:create", "menu:browse", "customers:identify", "notifications:reply", "webhooks:incoming"],
        sourceModule: "core",
      },
      {
        type: "facebook",
        title: "Facebook page / Messenger",
        category: "social",
        providerModule: "sales-channel-facebook",
        marketplaceAppId: "sales-channel-facebook",
        countries: ["VN"],
        icon: "thumb_up",
        capabilities: ["orders:create", "menu:browse", "customers:identify", "webhooks:incoming"],
        sourceModule: "core",
      },
      {
        type: "mobile-app",
        title: "Mobile app",
        category: "mobile",
        providerModule: "sales-channel-mobile",
        marketplaceAppId: "sales-channel-mobile",
        icon: "smartphone",
        capabilities: ["orders:create", "orders:pay", "orders:status", "menu:browse", "customers:identify"],
        sourceModule: "core",
      },
      {
        type: "kiosk",
        title: "Self-order kiosk",
        category: "kiosk",
        providerModule: "sales-channel-kiosk",
        marketplaceAppId: "sales-channel-kiosk",
        icon: "point_of_sale",
        capabilities: ["orders:create", "orders:pay", "menu:browse", "customers:anonymous"],
        sourceModule: "core",
      },
      {
        type: "qr-table-order",
        title: "QR table ordering",
        category: "kiosk",
        providerModule: "sales-channel-qr",
        marketplaceAppId: "sales-channel-qr",
        icon: "qr_code_2",
        capabilities: ["orders:create", "orders:pay", "menu:browse", "customers:anonymous"],
        sourceModule: "core",
      },
      {
        type: "custom",
        title: "Custom channel",
        category: "custom",
        providerModule: null,
        icon: "tune",
        capabilities: ["orders:create"],
        sourceModule: "core",
      },
    ]);

    try {
      const matrix = require("./dictionaries/salesChannelRegions.json");
      this.registerRegionRecommendations(matrix);
    } catch (e) {
      warn("failed to load salesChannelRegions.json", e);
    }
  }
}
