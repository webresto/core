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
    (cb) => db.addColumn('notification', 'important', { type: 'boolean', defaultValue: false }, cb),
    (cb) => db.addColumn('notification', 'deliveryAttempts', { type: 'real', notNull: false, defaultValue: 0 }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('notification', 'important', cb),
    (cb) => db.removeColumn('notification', 'deliveryAttempts', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
