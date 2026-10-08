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

exports.up = function (db, callback) {
  async.series([
    // Who created the channel: "provider" (SalesChannel.alive) or "operator". No backfill: existing
    // rows default to "operator" and the provider adopts one of them on its next boot.
    (cb) => db.addColumn('saleschannel', 'managedBy', { type: 'text', notNull: false, defaultValue: 'operator' }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('saleschannel', 'managedBy', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
