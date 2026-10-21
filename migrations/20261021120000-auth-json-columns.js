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
 * 20260722120000-add-auth-provider-models and 20260901120000-auth-v2-attempt-registry-identity created as
 * `text` (nullable, no default) the columns whose attributes the models declare `json`. Postgres hands such a column back as a string: AuthMethod.purposes was not an
 * array, so getForPurpose dropped every login method (no_method), and AuthAttempt.step had no id.
 * sails-disk keeps json as it is, which is why the tests of the core did not see it.
 *
 * changeColumn of db-migrate-pg casts the values itself (USING "<column>"::<type>).
 */
const COLUMNS = {
  authattempt: ['step', 'pendingProfile', 'customData'],
  authidentity: ['phone', 'proof', 'tokens'],
  authmethod: ['purposes', 'countries', 'salesChannels', 'config', 'customData'],
};

const changeTo = (db, type) => Object.entries(COLUMNS).flatMap(([table, columns]) =>
  columns.map((column) => (cb) => db.changeColumn(table, column, { type, notNull: false }, cb))
);

exports.up = function (db, callback) {
  async.series(changeTo(db, 'json'), callback);
};

exports.down = function (db, callback) {
  async.series(changeTo(db, 'text'), callback);
};

exports._meta = {
  "version": 1
};
