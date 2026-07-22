"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
/**
 * The fact "external account X at provider P belongs to User U".
 * Logical unique key: (provider, externalId). One User may have many identities
 * (telegram + max + vk). Enables repeat login, multi-provider linking and takeover protection.
 */
let attributes = {
    id: {
        type: "string",
    },
    /** slug (== AuthProvider.adapter) */
    provider: {
        type: "string",
        required: true,
    },
    /** sub / uid / telegram id / max id — stable at the provider */
    externalId: {
        type: "string",
        required: true,
    },
    user: {
        model: "user",
    },
    /** Denormalized profile snapshot (NOT the source of truth) */
    email: "string",
    phone: "json",
    displayName: "string",
    avatarUrl: "string",
    /**
     * Provider tokens, if needed for repeat calls. Encrypt at rest.
     * { accessToken, refreshToken, expiresAt }
     */
    tokens: "json",
    lastLoginAt: "number",
};
let Model = {
    beforeCreate: function (record, cb) {
        if (!record.id) {
            record.id = (0, uuid_1.v4)();
        }
        cb();
    },
    /** Find an identity by the logical unique key. */
    async findByExternal(provider, externalId) {
        return await AuthIdentity.findOne({ provider, externalId });
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
