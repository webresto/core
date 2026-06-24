import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
/**
 * SalesChannel
 *
 * A configured entry point that can create orders for this project — a website,
 * a messenger bot, a kiosk, a staff order-entry surface, an aggregator bridge, etc.
 * See ai-notes/sales-channels-research.md (§3.1 minimal model).
 *
 * The reusable *kind* of channel ("web-storefront", "telegram-bot", …) is described by
 * SalesChannelRegistry types; THIS model is the concrete enabled instance. The instance
 * `key` is the stable slug written into Order.orderedOnPlatform.
 */
export type SalesChannelStatus = "draft" | "needs_setup" | "ready" | "disabled" | "error";
declare let attributes: {
    /** UUID generated in beforeCreate. */
    id: string;
    /**
     * Stable slug used as Order.orderedOnPlatform. Uniqueness is enforced in the upsert
     * controller (mirrors the promo-code precedent — no DB unique constraint/migration).
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
     * Idempotent boot-time backfill (doc §14). If the table is empty, create one disabled-or-
     * enabled SalesChannel per distinct non-empty Order.orderedOnPlatform value so existing
     * reports and frontends keep working. Marked as type "legacy" / providerModule null.
     */
    backfillFromOrders(): Promise<void>;
};
declare global {
    const SalesChannel: typeof Model & ORMModel<SalesChannelRecord, "providerModule" | "enabled" | "status" | "countries" | "concepts" | "defaultConcept" | "allowConceptSwitch" | "url" | "settings" | "publicConfig" | "secretsRef" | "sortOrder" | "type">;
}
export {};
