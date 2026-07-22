"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
/** Default TTL for an in-flight login attempt (ms). */
const DEFAULT_TTL_MS = 10 * 60 * 1000;
/**
 * Ephemeral state of a single login attempt. Holds the oauth state/nonce/PKCE and,
 * for social logins waiting on phone confirmation, the pending profile. TTL-cleaned.
 * `id` doubles as the oauth `state` parameter.
 */
let attributes = {
    /** == oauth `state` */
    id: {
        type: "string",
    },
    provider: {
        type: "string",
        required: true,
    },
    /** the UserDevice that initiated the login */
    deviceId: {
        type: "string",
        required: true,
    },
    /** PKCE / OIDC */
    nonce: "string",
    codeVerifier: "string",
    redirectBack: "string",
    salesChannel: "string",
    country: "string",
    locale: "string",
    /** NormalizedProfile of a social login that still needs a confirmed phone */
    pendingProfile: "json",
    status: {
        type: "string",
        isIn: ["started", "awaiting_phone", "done", "expired"],
    },
    /** login string used for the OTP request while awaiting phone confirmation */
    otpLogin: "string",
    /** once done: the User this attempt resolved to (for authStatus polling) */
    resolvedUser: "string",
    /** one-time ticket the browser exchanges for a JWT (OAuth redirect flow) */
    authTicket: "string",
    /**
     * Provider-specific scratch data for this attempt, owned by the provider module — the core
     * never interprets it. Bot flows (Telegram/MAX) use it to remember the chat that started the
     * login (e.g. { telegramChatId }) so a later "share contact" message can be matched back to
     * this AuthState, since that message does not carry the `/start <stateId>` param.
     */
    customData: "json",
    /** TTL — cleaned by cron/afterHook */
    expiresAt: "number",
};
let Model = {
    beforeCreate: function (record, cb) {
        if (!record.id) {
            record.id = (0, uuid_1.v4)();
        }
        if (!record.status) {
            record.status = "started";
        }
        if (!record.expiresAt) {
            record.expiresAt = Date.now() + DEFAULT_TTL_MS;
        }
        cb();
    },
    /** Fetch a non-expired state. Marks expired ones and returns undefined. */
    async getActive(stateId) {
        const state = await AuthState.findOne({ id: stateId });
        if (!state)
            return undefined;
        if (state.expiresAt && state.expiresAt < Date.now()) {
            await AuthState.updateOne({ id: stateId }, { status: "expired" });
            return undefined;
        }
        return state;
    },
    /** Delete states whose TTL has passed (called from a periodic cleanup). */
    async cleanupExpired() {
        const expired = await AuthState.find({ where: { expiresAt: { "<": Date.now() } } });
        if (expired.length) {
            await AuthState.destroy({ id: expired.map((s) => s.id) });
        }
        return expired.length;
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
