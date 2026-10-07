import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
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
export type SalesChannelStatus = "draft" | "needs_setup" | "ready" | "disabled" | "error";
declare let attributes: {
    /** UUID generated in beforeCreate. */
    id: string;
    /**
     * Stable slug for this backend client. This is distinct from runtime platform strings
     * like "web", "pwa-ios", or "android". Uniqueness is enforced in the upsert controller
     * (mirrors the promo-code precedent — no DB unique constraint/migration).
     */
    key: string;
    /** Human-readable name, e.g. "Main website", "Telegram delivery bot". */
    title: string;
    /**
     * Channel type slug from SalesChannelRegistry: web-storefront, telegram-bot,
     * admin-front-site, custom, legacy (for backfilled values), …
     */
    type: string;
    /** appId of the module that provides this type. null for custom/manual channels. */
    providerModule: string | null;
    /**
     * Who created the record: "provider" — SalesChannel.alive() of the provider module (or an
     * adopted pre-existing record), "operator" — created by hand. Provider channels cannot be
     * deleted while the provider is installed; see removeProviderChannels() for uninstall.
     */
    managedBy: SalesChannelManagedBy;
    /** Operator's switch. Only active channels (enabled + ready + live provider) take orders. */
    enabled: boolean;
    /**
     * Readiness reported by the provider (ready / needs_setup / error) — written only by
     * refreshStatus()/channelStatus(), never derived from `enabled`. draft/disabled remain
     * for records created before providers reported readiness.
     */
    status: SalesChannelStatus;
    /** ISO 3166-1 alpha-2 codes where this instance is intended to run. */
    countries: string[];
    /** Concept allowlist. Empty array = all concepts (doc §6.2). */
    concepts: string[];
    /**
     * Runtime platform/device labels (e.g. "web", "pwa-android", "pwa-ios", "app-ios") that
     * report orders through this channel. An incoming Order.orderedOnPlatform value resolves
     * to this channel if it equals `key` OR appears in this list — one channel can cover
     * several runtime variants of the same backend client. A platform belongs to at most one
     * channel (enforced on save). Filled from the provider's defaults when alive() creates or
     * adopts the provider's channel with an empty list; otherwise set by the operator.
     */
    platforms: string[];
    /** Default concept this channel writes into orders, when set. */
    defaultConcept: string | null;
    /** Whether the frontend/bot may expose a concept selector when multiple are bound. */
    allowConceptSwitch: boolean;
    /** Public URL / deep-link for the channel (storefront URL, bot link, …). */
    url: string | null;
    /** Instance-level NON-secret configuration choices (doc §8.3). */
    settings: Record<string, unknown>;
    /** Config safe to expose to public frontends/bots. */
    publicConfig: Record<string, unknown>;
    /** References to Settings/env where secrets live — NOT raw secrets (doc §8.3, §13). */
    secretsRef: Record<string, unknown>;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
};
type attributes = typeof attributes;
export interface SalesChannelRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
declare let Model: {
    beforeCreate(init: SalesChannelRecord, cb: (err?: string) => void): void;
    /**
     * Provider self-registration on boot (analogue of AuthProvider.alive). Registers the type
     * definition and keeps the adapter in memory in EVERY worker; creates/adopts the provider's
     * channel and stores its first status only in the primary worker. On later boots only
     * `status` is refreshed, and only when it changed — operator fields are never touched.
     *
     * One provider per type: if another module already registered an adapter for this type,
     * the call is refused with a warning (channels of a type are all served by one module).
     */
    alive(adapter: SalesChannelAdapter): Promise<void>;
    /** Live adapter of a channel type (undefined if no provider registered it in this process). */
    getAdapter(type: string): SalesChannelAdapter | undefined;
    /** Channel types that currently have a live provider. */
    getAliveTypes(): string[];
    /**
     * Active channel = enabled by the operator, provider alive, provider-reported `ready`.
     * Only active channels count as order sources, in the setup checklist and in widgets.
     * Reads the stored `status`; callers that need a fresh one call channelStatus() first.
     */
    isActive(channel: SalesChannelRecord | null | undefined): boolean;
    /**
     * Fresh readiness of one channel from its provider. The result is stored only when the
     * provider answered (incl. throwing or timing out) and the value changed. "Provider did
     * not load" is computed on read and never stored.
     */
    channelStatus(channel: SalesChannelRecord): Promise<SalesChannelStatusResult>;
    /**
     * Ask the provider about every channel of a type and store changed statuses. Called by
     * alive() on boot, by the admin read paths, and by providers after their own events
     * (admin-frontend: after a storefront build). Returns channel id → readiness.
     */
    refreshStatus(type: string): Promise<Record<string, SalesChannelStatusResult>>;
    /** Delete a channel record, letting its provider clean up its side first. */
    destroyChannel(channel: SalesChannelRecord): Promise<void>;
    /**
     * The provider module is being uninstalled (app-manager remove action, before restart, so
     * the adapter is still loaded). Operator-created channels of the module and provider
     * channels nobody edited are deleted; an edited provider channel stays, disabled, and the
     * operator may delete it later. The module's adapters are dropped from memory.
     */
    removeProviderChannels(appId: string): Promise<{
        removed: string[];
        disabled: string[];
    }>;
    /**
     * Which other channel already declares one of these platforms (a platform has one owner,
     * otherwise SalesChannel.resolve would attribute orders to whichever comes first).
     */
    findPlatformOwner(platforms: string[], exceptId?: string | null): Promise<{
        platform: string;
        channel: SalesChannelRecord;
    } | null>;
    /**
     * Resolve a channel by its public key, or by one of the runtime platforms it declares.
     * Returns the ACTIVE instance (see isActive) or null. Used to validate/normalize an
     * incoming order source.
     */
    resolve(key: string): Promise<SalesChannelRecord | null>;
    /**
     * Normalize an order-source value (doc §16 step 3 / §15 open question → warn-only).
     *
     * Backward compatible: returns the SAME string it was given (never throws). When the
     * value does not match a known enabled channel it only logs a warning, so legacy
     * frontends/bots keep working during the transition.
     */
    normalizePlatform(key: string | null | undefined): Promise<string | null>;
};
declare global {
    const SalesChannel: typeof Model & ORMModel<SalesChannelRecord, "providerModule" | "managedBy" | "enabled" | "status" | "countries" | "concepts" | "platforms" | "defaultConcept" | "allowConceptSwitch" | "url" | "settings" | "publicConfig" | "secretsRef" | "sortOrder" | "type">;
}
export {};
