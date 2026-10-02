'use strict';

var async = require('async');
var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

/**
 * Auth v2: three models replace seven (.ai-notes/auth/design2.md,
 * .ai-notes/auth/extend_user_account.md).
 *
 *   authprovider + (planned verificationmethod/verificationprovider) → authmethod
 *   authstate + onetimepassword + (planned verificationattempt)      → authattempt
 *   authidentity + User.login=phone                                  → authidentity, phone included
 *
 * Nothing is deprecated and nothing is bridged: there is no production data behind any of it,
 * and keeping two answers to "what can you sign in with" alive at once is the worst state the
 * system can be in (extend_user_account §13).
 *
 * JSON attributes are stored as text, matching the convention of every other recent model here
 * (saleschannel / notification / authprovider).
 */
exports.up = function (db, callback) {
  async.series([
    // ── the registry: one row = one (adapter, offer) capability ─────────────────────────────
    (cb) => db.createTable('authmethod', {
      columns: {
        id:                       { type: 'text', primaryKey: true },
        // declared by the adapter's code at alive(); the operator does not edit these (И4)
        adapter:                  { type: 'text', notNull: true },
        offer:                    { type: 'text', notNull: true },
        kind:                     { type: 'text', notNull: false },
        flow:                     { type: 'text', notNull: false },
        mode:                     { type: 'text', notNull: false },
        secretOrigin:             { type: 'text', notNull: false },
        codeLength:               { type: 'int', notNull: false },
        canVerifyPhone:           { type: 'boolean', notNull: false, defaultValue: false },
        providerModule:           { type: 'text', notNull: false },
        healthStatus:             { type: 'text', notNull: false },
        // business decisions; the operator edits these
        enable:                   { type: 'boolean', notNull: false, defaultValue: false },
        sortOrder:                { type: 'real', notNull: false, defaultValue: 0 },
        titleKey:                 { type: 'text', notNull: false },
        hintKey:                  { type: 'text', notNull: false },
        iconUrl:                  { type: 'text', notNull: false },
        buttonColor:              { type: 'text', notNull: false },
        buttonTextColor:          { type: 'text', notNull: false },
        purposes:                 { type: 'text', notNull: false },
        countries:                { type: 'text', notNull: false },
        salesChannels:            { type: 'text', notNull: false },
        ttlSec:                   { type: 'int', notNull: false },
        resendAfterSec:           { type: 'int', notNull: false },
        cost:                     { type: 'real', notNull: false, defaultValue: 0 },
        requirePhoneVerification: { type: 'boolean', notNull: false, defaultValue: false },
        maxPerUser:               { type: 'int', notNull: false },
        config:                   { type: 'text', notNull: false },
        customData:               { type: 'text', notNull: false },
        createdAt:                { type: 'real', notNull: false },
        updatedAt:                { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),

    // Two modules claiming the same capability is a defect, not a race to load last: the
    // registry has to be able to say "conflict" instead of silently keeping whichever
    // registered second (design2 §4.1, Д1).
    (cb) => db.runSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "authmethod_adapter_offer_uidx" ON "authmethod" ("adapter", "offer")',
      cb
    ),

    // ── the one state machine ───────────────────────────────────────────────────────────────
    (cb) => db.createTable('authattempt', {
      columns: {
        // uuid, NOT autoIncrement: the id is the address of the attempt and it hands out a
        // ticket, so a walkable sequence would be a hole (design2 §10.2, Д9).
        id:              { type: 'text', primaryKey: true },
        purpose:         { type: 'text', notNull: true },
        deviceId:        { type: 'text', notNull: true },
        "user":          { type: 'text', notNull: false },
        methodAdapter:   { type: 'text', notNull: false },
        methodOffer:     { type: 'text', notNull: false },
        target:          { type: 'text', notNull: false },
        step:            { type: 'text', notNull: false },
        // flat copy of step.type: the sentAt compare-and-set cannot reach inside JSON (И8)
        stepType:        { type: 'text', notNull: false },
        secret:          { type: 'text', notNull: false },
        secretExpiresAt: { type: 'real', notNull: false },
        wrongGuesses:    { type: 'int', notNull: false, defaultValue: 0 },
        sentAt:          { type: 'real', notNull: false },
        resends:         { type: 'int', notNull: false, defaultValue: 0 },
        switches:        { type: 'int', notNull: false, defaultValue: 0 },
        // flash-call: never leaves the server, never reaches a GraphQL projection (И1, §10.1)
        callerNumber:    { type: 'text', notNull: false },
        providerRef:     { type: 'text', notNull: false },
        pendingProfile:  { type: 'text', notNull: false },
        nonce:           { type: 'text', notNull: false },
        codeVerifier:    { type: 'text', notNull: false },
        ticket:          { type: 'text', notNull: false },
        ticketConsumedAt:{ type: 'real', notNull: false },
        status:          { type: 'text', notNull: false, defaultValue: 'started' },
        failReason:      { type: 'text', notNull: false },
        customData:      { type: 'text', notNull: false },
        expiresAt:       { type: 'real', notNull: false },
        createdAt:       { type: 'real', notNull: false },
        updatedAt:       { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),

    // The hot paths: redeeming a ticket, matching a provider webhook, and the per-login
    // antiflood window that spans attempts (И6).
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authattempt_ticket_idx" ON "authattempt" ("ticket")', cb),
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authattempt_provider_ref_idx" ON "authattempt" ("providerRef")', cb),
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authattempt_target_sent_idx" ON "authattempt" ("target", "sentAt")', cb),

    // ── the send ledger the antiflood is computed from ──────────────────────────────────────
    // Append-only, keyed by target and deliberately NOT tied to authattempt: the budget must
    // outlive the attempt that spent it, or authSwitch (which rebuilds the step and nulls
    // sentAt) hands out an unmetered SMS pump aimed at somebody else's number (review1 §1.2).
    (cb) => db.createTable('authsendlog', {
      columns: {
        id:        { type: 'text', primaryKey: true },
        target:    { type: 'text', notNull: true },
        attempt:   { type: 'text', notNull: false },
        deviceId:  { type: 'text', notNull: false },
        adapter:   { type: 'text', notNull: false },
        offer:     { type: 'text', notNull: false },
        kind:      { type: 'text', notNull: false },
        at:        { type: 'real', notNull: false },
        createdAt: { type: 'real', notNull: false },
        updatedAt: { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),

    // The only query shape there is: "what went to this target since T".
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authsendlog_target_at_idx" ON "authsendlog" ("target", "at")', cb),

    // ── identity becomes the only thing that grants access ──────────────────────────────────
    (cb) => db.addColumn('authidentity', 'proof', { type: 'text', notNull: false }, cb),
    (cb) => db.addColumn('authidentity', 'label', { type: 'text', notNull: false }, cb),
    (cb) => db.addColumn('authidentity', 'linkedAt', { type: 'real', notNull: false }, cb),
    (cb) => db.addColumn('authidentity', 'lastUsedAt', { type: 'real', notNull: false }, cb),
    (cb) => db.addColumn('authidentity', 'linkedVia', { type: 'text', notNull: false }, cb),
    // DEFERRED to the field cleanup in the next core version (see the login block below):
    // (cb) => db.removeColumn('authidentity', 'lastLoginAt', cb),
    // (cb) => db.removeColumn('user', 'passwordHash', cb),
    // (cb) => db.removeColumn('user', 'lastPasswordChange', cb),
    //   — the password subsystem is gone (.ai-notes/auth/remove-password.md); the columns
    //   stay until the cleanup, their values are nulled on 2.6 by the bg-job
    //   auth-v2-password-purge (they held bcrypt hashes of the last OTP, not passwords).
    // (cb) => db.removeColumn('user', 'emailVerified', cb),
    // (cb) => db.removeColumn('authidentity', 'email', cb),
    //   — no reader and no writer on 2.6 (.ai-notes/auth-1/2-remove-email-plan.md, stage A).
    //   Both are attributes of the pre-2.6 models, so dropping them here would break a rollback
    //   on the first User / AuthIdentity query. Nothing to purge: the core never wrote
    //   `emailVerified` true, and `authidentity.email` was a provider snapshot nothing read.

    // Waterline alone did not hold this, and two callbacks racing produced two links for one
    // number pointing at different accounts (design2 Д3). It is also what enforces "one number,
    // one account" now that the number is an identity rather than a unique column on user.
    (cb) => db.runSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "authidentity_provider_externalid_uidx" ON "authidentity" ("provider", "externalId")',
      cb
    ),

    // ── the account keeps no field that grants access ───────────────────────────────────────
    // Everything that used to be reachable through `login` is reachable through an identity;
    // `phone` stays as the denormalized copy external bonus/RMS adapters read (extend §3.3).
    //
    // DEFERRED (BackgroundJob-style background migration): dropping `login` here would destroy the
    // phone numbers before anything moved them out. The column stays; instead:
    //   transfer on core >=2.6  → api/hooks/bg-jobs/jobs/auth-v2-phone-transfer.js
    //     (login → authidentity provider:"phone" + user.primaryPhone, deletes nothing)
    // No backup copy is taken anywhere: this surviving column IS the only source, which is why
    // actually dropping login (and the rest of the deletes below) is a field cleanup for the
    // NEXT core version, after the transfer has proven itself. The bg-jobs guard refuses to
    // start a core that jumped past the transfer's gate while it is still unfinished.
    // (cb) => db.removeColumn('user', 'login', cb),
    (cb) => db.addColumn('user', 'primaryPhone', { type: 'text', notNull: false }, cb),

    // Which identity opened this session — so unlinking it can actually close the session it
    // opened, instead of leaving the "revoked" way in working (extend §3.4, И15).
    (cb) => db.addColumn('userdevice', 'identity', { type: 'text', notNull: false }, cb),

    // ── what the three models replace ───────────────────────────────────────────────────────
    // DEFERRED to the field cleanup in the next core version, together with the deletes above:
    // (cb) => db.dropTable('authstate', { ifExists: true }, cb),
    // (cb) => db.dropTable('onetimepassword', { ifExists: true }, cb),
    // (cb) => db.dropTable('authprovider', { ifExists: true }, cb),

    // Settings that no longer control anything: CORE_LOGIN_FIELD chose what went into the
    // deleted column; LOGIN_OTP_REQUIRED / CORE_LOGIN_OTP_REQUIRED were a duplicated pair of
    // which only one was ever read; DEFAULT_OTP_ADAPTER pointed at a module family that no
    // longer exists; CREATE_USER_IF_NOT_EXIST was read only inside the deleted User.login();
    // CORE_SET_LAST_OTP_AS_PASSWORD gated the password checks on a mechanic design2 removed and
    // CORE_PASSWORD_REQUIRED never had a reader at all (review1 §4) — their manifests and seeds
    // are gone in this version, so the rows are inert.
    // DEFERRED to the next-version field cleanup with the rest of the deletes. PASSWORD_* went
    // with the password subsystem itself (.ai-notes/auth/remove-password.md): no manifest, no
    // reader, the rows are inert until this runs.
    // (cb) => db.runSql(
    //   "DELETE FROM settings WHERE key IN ('CORE_LOGIN_FIELD', 'CORE_LOGIN_OTP_REQUIRED', 'LOGIN_OTP_REQUIRED', 'DEFAULT_OTP_ADAPTER', 'CREATE_USER_IF_NOT_EXIST', 'CORE_SET_LAST_OTP_AS_PASSWORD', 'CORE_PASSWORD_REQUIRED', 'PASSWORD_POLICY', 'PASSWORD_REGEX', 'PASSWORD_MIN_LENGTH', 'PASSWORD_SALT')",
    //   cb
    // ),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('userdevice', 'identity', cb),
    (cb) => db.removeColumn('user', 'primaryPhone', cb),
    // user.login / authidentity.lastLoginAt are no longer removed by up() (deferred to the
    // next-version field cleanup), so down() must not re-create them:
    // (cb) => db.addColumn('user', 'login', { type: 'text', notNull: false }, cb),
    (cb) => db.runSql('DROP INDEX IF EXISTS "authidentity_provider_externalid_uidx"', cb),
    // (cb) => db.addColumn('authidentity', 'lastLoginAt', { type: 'real', notNull: false }, cb),
    (cb) => db.removeColumn('authidentity', 'linkedVia', cb),
    (cb) => db.removeColumn('authidentity', 'lastUsedAt', cb),
    (cb) => db.removeColumn('authidentity', 'linkedAt', cb),
    (cb) => db.removeColumn('authidentity', 'label', cb),
    (cb) => db.removeColumn('authidentity', 'proof', cb),
    (cb) => db.dropTable('authsendlog', { ifExists: true }, cb),
    (cb) => db.dropTable('authattempt', { ifExists: true }, cb),
    (cb) => db.dropTable('authmethod', { ifExists: true }, cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
