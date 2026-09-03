"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
/** Live adapter instances that self-registered on boot (slug → adapter). */
let aliveAuthProviders = {};
let attributes = {
    /** ID of the auth provider config-instance */
    id: {
        type: "string",
    },
    /** Slug of the provider *type* (telegram, zalo, fb …). One row = one button on the login page. */
    adapter: {
        type: "string",
        unique: true,
        required: true,
    },
    /** Button label */
    title: "string",
    /** AuthFlowKind, denormalized from the adapter so the UI can render without a live adapter */
    kind: "string",
    /** Master on/off switch (default from DEFAULT_ENABLE_AUTH_PROVIDERS) */
    enable: {
        type: "boolean",
    },
    sortOrder: "number",
    /** Branding for the login page */
    iconUrl: "string",
    buttonColor: "string",
    buttonTextColor: "string",
    /**
     * Secrets / keys. NEVER exposed through GraphQL (see AuthProviderPublic / getAvailable).
     * { clientId, clientSecret, botToken, scope, redirectUri, ... }
     */
    config: "json",
    /** true => after a social login force phone confirmation by OTP */
    requirePhoneVerification: {
        type: "boolean",
    },
    /** true => if the provider returned a verified phone (Telegram/MAX contact), trust it without OTP */
    trustProviderPhone: {
        type: "boolean",
    },
    /** Targeting: which sales channels this provider is shown in (slugs / ids) */
    salesChannels: "json",
    /** Targeting: countries this provider is recommended/limited to (['RU','KZ']) */
    countries: "json",
    /** appId of the module that supplies this provider (like SalesChannel.providerModule) */
    providerModule: {
        type: "string",
        allowNull: true,
    },
    /** ready | needs_setup | error — updated by alive()/healthcheck() */
    healthStatus: "string",
    customData: "json",
};
const PUBLIC_FIELDS = ["adapter", "title", "kind", "iconUrl", "buttonColor", "buttonTextColor", "sortOrder"];
function toPublic(row) {
    const out = {};
    for (const f of PUBLIC_FIELDS)
        out[f] = row[f];
    return out;
}
let Model = {
    beforeCreate: function (record, cb) {
        if (!record.id) {
            record.id = (0, uuid_1.v4)();
        }
        cb();
    },
    /**
     * Self-registration on boot (analogue of PaymentMethod.alive). findOrCreate the config row,
     * cache the live adapter instance, refresh denormalized fields + healthStatus.
     */
    async alive(authAdapter) {
        const init = authAdapter.InitAuthAdapter;
        let defaultEnable = (await Settings.get("DEFAULT_ENABLE_AUTH_PROVIDERS")) ?? false;
        const known = await AuthProvider.findOrCreate({ adapter: init.adapter }, {
            adapter: init.adapter,
            title: init.title,
            kind: init.kind,
            iconUrl: init.iconUrl,
            buttonColor: init.buttonColor,
            buttonTextColor: init.buttonTextColor,
            sortOrder: init.sortOrder ?? 0,
            enable: defaultEnable,
            // Seed the phone-verification policy from the adapter's declared defaults on first create;
            // the operator can override these later in the admin without them being reset.
            trustProviderPhone: init.trustProviderPhone ?? false,
            requirePhoneVerification: init.requirePhoneVerification ?? false,
            providerModule: init.config?.providerModule ?? null,
            healthStatus: "needs_setup",
        });
        aliveAuthProviders[init.adapter] = authAdapter;
        // Refresh denormalized UI fields (kind/title/icon can change between versions) and health.
        let health = { ok: true };
        try {
            health = await authAdapter.healthcheck();
        }
        catch (e) {
            health = { ok: false, message: `${e}` };
        }
        await AuthProvider.updateOne({ adapter: init.adapter }, {
            title: known.title || init.title,
            kind: init.kind,
            // Refresh which module supplies this provider, so moving a provider between modules
            // (e.g. telegram: ru_auth_providers → telegram_auth_provider) corrects the stored appId.
            providerModule: init.config?.providerModule ?? known.providerModule ?? null,
            healthStatus: health.ok ? "ready" : "needs_setup",
        });
        sails.log.silly("AuthProvider > alive", init.adapter, health);
        return;
    },
    /** Returns the live adapter instance for a slug (undefined if not alive). */
    getAdapter(slug) {
        return aliveAuthProviders[slug];
    },
    /** Slugs of all currently-alive adapters. */
    getAliveSlugs() {
        return Object.keys(aliveAuthProviders);
    },
    /**
     * Public list for the login page: enable && alive, sorted, filtered by channel/country.
     * Returns ONLY public fields — secrets are stripped here.
     */
    async getAvailable(ctx) {
        const rows = await AuthProvider.find({
            where: {
                adapter: Object.keys(aliveAuthProviders),
                enable: true,
            },
            sort: "sortOrder ASC",
        });
        const filtered = rows.filter((row) => {
            if (ctx?.salesChannel && Array.isArray(row.salesChannels) && row.salesChannels.length) {
                if (!row.salesChannels.includes(ctx.salesChannel))
                    return false;
            }
            if (ctx?.country && Array.isArray(row.countries) && row.countries.length) {
                if (!row.countries.includes(ctx.country.toUpperCase()))
                    return false;
            }
            return true;
        });
        return filtered.map(toPublic);
    },
    /** Returns the full config row by slug (server-side only — includes secrets). */
    async getBySlug(slug) {
        return await AuthProvider.findOne({ adapter: slug });
    },
    /** Re-run the adapter healthcheck and persist the status (used by the admin "Check" button). */
    async runHealthcheck(slug) {
        const adapter = aliveAuthProviders[slug];
        if (!adapter)
            return { ok: false, message: "adapter is not alive" };
        let health;
        try {
            health = await adapter.healthcheck();
        }
        catch (e) {
            health = { ok: false, message: `${e}` };
        }
        await AuthProvider.updateOne({ adapter: slug }, { healthStatus: health.ok ? "ready" : "error" });
        return health;
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
