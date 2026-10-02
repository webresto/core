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
 * Auth v2, follow-up: indexes under the queries every `authStart` actually runs (review2 §2.3).
 *
 * The first migration indexed the hot paths it knew about — ticket redemption, the webhook
 * lookup by providerRef, and a per-target antiflood that has since moved out of `authattempt`
 * into the `authsendlog` ledger (review1 §1.2). What each attempt runs today, and had no index:
 *
 *   authattempt (deviceId, status)   AuthService.start: supersede the device's previous attempt
 *                                    for the same purpose, then count its live attempts for
 *                                    AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE
 *   authattempt (expiresAt)          AuthAttempt.cleanupExpired, both sweeps (live rows past
 *                                    their deadline; done rows past the retention window)
 *   authsendlog (at)                 AuthSendLog.countAllSince — the installation-wide hourly cap
 *                                    (send-caps.md §1.1) — and AuthSendLog.cleanup. The existing
 *                                    (target, at) index does not serve a query with no target.
 *   authidentity (user)              every login: syncUserProjections, readIncumbent and the
 *                                    account view all fetch an account's identity set by user
 *
 * `authattempt_target_sent_idx` (target, sentAt) is dropped: nothing reads `sentAt` by target any
 * more — the budget is computed from `authsendlog`, and `sentAt` is the per-attempt CAS marker
 * (И8), not a history.
 *
 * Tables are small today (a month of done rows), so this is about not regressing on a query that
 * is run per sign-in, not about a measured problem.
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authattempt_device_status_idx" ON "authattempt" ("deviceId", "status")', cb),
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authattempt_expires_idx" ON "authattempt" ("expiresAt")', cb),
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authsendlog_at_idx" ON "authsendlog" ("at")', cb),
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authidentity_user_idx" ON "authidentity" ("user")', cb),
    (cb) => db.runSql('DROP INDEX IF EXISTS "authattempt_target_sent_idx"', cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.runSql('CREATE INDEX IF NOT EXISTS "authattempt_target_sent_idx" ON "authattempt" ("target", "sentAt")', cb),
    (cb) => db.runSql('DROP INDEX IF EXISTS "authidentity_user_idx"', cb),
    (cb) => db.runSql('DROP INDEX IF EXISTS "authsendlog_at_idx"', cb),
    (cb) => db.runSql('DROP INDEX IF EXISTS "authattempt_expires_idx"', cb),
    (cb) => db.runSql('DROP INDEX IF EXISTS "authattempt_device_status_idx"', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
