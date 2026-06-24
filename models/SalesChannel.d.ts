import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
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
    /** Master switch. Only enabled channels are valid order sources / shown as ready. */
    enabled: boolean;
    /** Lifecycle/readiness state surfaced in the admin UI. */
    status: SalesChannelStatus;
    /** ISO 3166-1 alpha-2 codes where this instance is intended to run. */
    countries: string[];
    /** Concept allowlist. Empty array = all concepts (doc §6.2). */
    concepts: string[];
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
     * Resolve a channel by its public key. Returns the ENABLED instance or null.
     * Used to validate/normalize an incoming order source.
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
    /**
     * Idempotent boot-time backfill (doc §14). This is legacy-only migration glue: when
     * the table is empty, mirror distinct historical Order.orderedOnPlatform values into
     * type "legacy" records so old reports/frontends keep working. Do not use this as the
     * conceptual model for new runtime platform labels; new SalesChannel rows should model
     * backend clients/integrations.
     */
    backfillFromOrders(): Promise<void>;
};
declare global {
    const SalesChannel: typeof Model & ORMModel<SalesChannelRecord, "providerModule" | "enabled" | "status" | "countries" | "concepts" | "defaultConcept" | "allowConceptSwitch" | "url" | "settings" | "publicConfig" | "secretsRef" | "sortOrder" | "type">;
}
export {};
