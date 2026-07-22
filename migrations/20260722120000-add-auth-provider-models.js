'use strict';

var async = require('async');
var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

/**
 * Auth providers layer (see .ai-notes/auth.md): three new models introduced in this branch.
 *   - authprovider: operator-configured provider config-instances (one row per login button).
 *   - authidentity: "external account X at provider P belongs to User U" (repeat login / linking).
 *   - authstate:    ephemeral per-attempt oauth/PKCE state, TTL-cleaned.
 * JSON attributes (config, tokens, phone, arrays) are stored as text, matching the
 * convention of other recent models (see saleschannel/notification migrations).
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.createTable('authprovider', {
      columns: {
        id:                       { type: 'text', primaryKey: true },
        adapter:                  { type: 'text', notNull: true, unique: true },
        title:                    { type: 'text', notNull: false },
        kind:                     { type: 'text', notNull: false },
        enable:                   { type: 'boolean', notNull: false, defaultValue: false },
        sortOrder:                { type: 'real', notNull: false, defaultValue: 0 },
        iconUrl:                  { type: 'text', notNull: false },
        buttonColor:              { type: 'text', notNull: false },
        buttonTextColor:          { type: 'text', notNull: false },
        config:                   { type: 'text', notNull: false },
        requirePhoneVerification: { type: 'boolean', notNull: false, defaultValue: false },
        trustProviderPhone:       { type: 'boolean', notNull: false, defaultValue: false },
        salesChannels:            { type: 'text', notNull: false },
        countries:                { type: 'text', notNull: false },
        providerModule:           { type: 'text', notNull: false },
        healthStatus:             { type: 'text', notNull: false },
        customData:               { type: 'text', notNull: false },
        createdAt:                { type: 'real', notNull: false },
        updatedAt:                { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),

    (cb) => db.createTable('authidentity', {
      columns: {
        id:          { type: 'text', primaryKey: true },
        provider:    { type: 'text', notNull: true },
        externalId:  { type: 'text', notNull: true },
        user:        { type: 'text', notNull: false },
        email:       { type: 'text', notNull: false },
        phone:       { type: 'text', notNull: false },
        displayName: { type: 'text', notNull: false },
        avatarUrl:   { type: 'text', notNull: false },
        tokens:      { type: 'text', notNull: false },
        lastLoginAt: { type: 'real', notNull: false },
        createdAt:   { type: 'real', notNull: false },
        updatedAt:   { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),

    (cb) => db.createTable('authstate', {
      columns: {
        id:             { type: 'text', primaryKey: true },
        provider:       { type: 'text', notNull: true },
        deviceId:       { type: 'text', notNull: true },
        nonce:          { type: 'text', notNull: false },
        codeVerifier:   { type: 'text', notNull: false },
        redirectBack:   { type: 'text', notNull: false },
        salesChannel:   { type: 'text', notNull: false },
        country:        { type: 'text', notNull: false },
        locale:         { type: 'text', notNull: false },
        pendingProfile: { type: 'text', notNull: false },
        status:         { type: 'text', notNull: false, defaultValue: 'started' },
        otpLogin:       { type: 'text', notNull: false },
        resolvedUser:   { type: 'text', notNull: false },
        authTicket:     { type: 'text', notNull: false },
        customData:     { type: 'text', notNull: false },
        expiresAt:      { type: 'real', notNull: false },
        createdAt:      { type: 'real', notNull: false },
        updatedAt:      { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),

    // NB: the logical unique key of an identity is (provider, externalId). Like every other
    // multi-field key in this codebase (e.g. SalesChannel), it is enforced at the Waterline
    // model layer, not by a composite DB index — kept consistent here on purpose.

    // New User attribute introduced alongside the auth-providers layer. `identities` is a
    // Waterline association (virtual, no column). `emailVerified` is a real boolean column,
    // mirroring the existing `verified` column; default false so existing rows are valid.
    (cb) => db.addColumn('user', 'emailVerified', { type: 'boolean', notNull: false, defaultValue: false }, cb),

    // PromotionCode.enable was added to the model in this same change set (defaultsTo: true).
    // Add the matching column with defaultValue true so already-existing promo codes stay
    // enabled after deploy — mirrors the model comment in PromotionCode.getValidPromotionCode.
    (cb) => db.addColumn('promotioncode', 'enable', { type: 'boolean', notNull: false, defaultValue: true }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('promotioncode', 'enable', cb),
    (cb) => db.removeColumn('user', 'emailVerified', cb),
    (cb) => db.dropTable('authstate', cb),
    (cb) => db.dropTable('authidentity', cb),
    (cb) => db.dropTable('authprovider', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
