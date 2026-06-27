"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** UUID generated in beforeCreate. */
    id: {
        type: "string",
    },
    /**
     * Stable slug for this backend client. This is distinct from runtime platform strings
     * like "web", "pwa-ios", or "android". Uniqueness is enforced in the upsert controller
     * (mirrors the promo-code precedent — no DB unique constraint/migration).
     */
    key: {
        type: "string",
    },
    /** Human-readable name, e.g. "Main website", "Telegram delivery bot". */
    title: {
        type: "string",
    },
    /**
     * Channel type slug from SalesChannelRegistry: web-storefront, telegram-bot,
     * admin-front-site, custom, legacy (for backfilled values), …
     */
    type: {
        type: "string",
        defaultsTo: "custom",
    },
    /** appId of the module that provides this type. null for custom/manual channels. */
    providerModule: {
        type: "string",
        allowNull: true,
    },
    /** Master switch. Only enabled channels are valid order sources / shown as ready. */
    enabled: {
        type: "boolean",
        defaultsTo: false,
    },
    /** Lifecycle/readiness state surfaced in the admin UI. */
    status: {
        type: "string",
        isIn: ["draft", "needs_setup", "ready", "disabled", "error"],
        defaultsTo: "draft",
    },
    /** ISO 3166-1 alpha-2 codes where this instance is intended to run. */
    countries: {
        type: "json",
        defaultsTo: [],
    },
    /** Concept allowlist. Empty array = all concepts (doc §6.2). */
    concepts: {
        type: "json",
        defaultsTo: [],
    },
    /**
     * Runtime platform/device labels (e.g. "web", "pwa-android", "pwa-ios", "app-ios") that
     * report orders through this channel. An incoming Order.orderedOnPlatform value resolves
     * to this channel if it equals `key` OR appears in this list — one channel can cover
     * several runtime variants of the same backend client. Set manually by the operator;
     * never filled automatically.
     */
    platforms: {
        type: "json",
        defaultsTo: [],
    },
    /** Default concept this channel writes into orders, when set. */
    defaultConcept: {
        type: "string",
        allowNull: true,
    },
    /** Whether the frontend/bot may expose a concept selector when multiple are bound. */
    allowConceptSwitch: {
        type: "boolean",
        defaultsTo: true,
    },
    /** Public URL / deep-link for the channel (storefront URL, bot link, …). */
    url: {
        type: "string",
        allowNull: true,
    },
    /** Instance-level NON-secret configuration choices (doc §8.3). */
    settings: {
        type: "json",
        defaultsTo: {},
    },
    /** Config safe to expose to public frontends/bots. */
    publicConfig: {
        type: "json",
        defaultsTo: {},
    },
    /** References to Settings/env where secrets live — NOT raw secrets (doc §8.3, §13). */
    secretsRef: {
        type: "json",
        defaultsTo: {},
    },
    sortOrder: {
        type: "number",
        defaultsTo: 0,
    },
    // autoCreatedAt/autoUpdatedAt as numbers — matches Notification so admin time-window
    // queries/sorts behave consistently.
    createdAt: {
        type: "number",
        autoCreatedAt: true,
    },
    updatedAt: {
        type: "number",
        autoUpdatedAt: true,
    },
};
let Model = {
    beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        cb();
    },
    /**
     * Resolve a channel by its public key, or by one of the runtime platforms it declares.
     * Returns the ENABLED instance or null. Used to validate/normalize an incoming order source.
     */
    async resolve(key) {
        const trimmed = String(key || "").trim();
        if (!trimmed)
            return null;
        const direct = await SalesChannel.findOne({ key: trimmed, enabled: true });
        if (direct)
            return direct;
        const enabledChannels = await SalesChannel.find({ enabled: true });
        return (enabledChannels.find((channel) => {
            const platforms = channel.platforms;
            return Array.isArray(platforms) && platforms.includes(trimmed);
        }) || null);
    },
    /**
     * Normalize an order-source value (doc §16 step 3 / §15 open question → warn-only).
     *
     * Backward compatible: returns the SAME string it was given (never throws). When the
     * value does not match a known enabled channel it only logs a warning, so legacy
     * frontends/bots keep working during the transition.
     */
    async normalizePlatform(key) {
        if (key === undefined || key === null)
            return null;
        const trimmed = String(key).trim();
        if (!trimmed)
            return trimmed;
        try {
            const channel = await SalesChannel.resolve(trimmed);
            if (!channel) {
                sails.log.warn(`SalesChannel > order source "${trimmed}" does not match an enabled sales channel — accepted for backward compatibility`);
            }
        }
        catch (e) {
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
