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
    // Terminal flag for the unread-escalation loop (see models/Notification.ts).
    // defaultValue false also backfills existing rows so they stay escalation-eligible
    // exactly once and then get flagged by the loop.
    (cb) => db.addColumn('notification', 'escalationExhausted', { type: 'boolean', notNull: false, defaultValue: false }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('notification', 'escalationExhausted', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
