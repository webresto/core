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
 * Missing columns of the Settings model:
 *   - secret:           the value is a token/password/key, stored in the DB only and never rendered in any UI.
 *   - restartRequired:  a changed value takes effect only after the application is restarted.
 *   - manifestChecksum: SHA-256 of the settings/*.json manifest that declared the setting.
 *
 * secret/restartRequired are new here; manifestChecksum already exists on the model but was
 * never migrated, so databases built from migrations alone are missing it.
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.addColumn('settings', 'secret', { type: 'boolean', notNull: false, defaultValue: false }, cb),
    (cb) => db.addColumn('settings', 'restartRequired', { type: 'boolean', notNull: false, defaultValue: false }, cb),
    (cb) => db.addColumn('settings', 'manifestChecksum', { type: 'text', notNull: false }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('settings', 'secret', cb),
    (cb) => db.removeColumn('settings', 'restartRequired', cb),
    (cb) => db.removeColumn('settings', 'manifestChecksum', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
