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
    (cb) => db.addColumn('notification', 'notificationTypeKey', { type: 'string', notNull: false }, cb),
    (cb) => db.addColumn('notification', 'eventKey', { type: 'string', notNull: false }, cb),
    (cb) => db.addColumn('notification', 'context', { type: 'text', notNull: false }, cb),
    (cb) => db.addColumn('notification', 'maxDeliveryCost', { type: 'real', notNull: false }, cb),
    (cb) => db.addColumn('notification', 'scheduledAt', { type: 'real', notNull: false }, cb),
    (cb) => db.addColumn('notification', 'idempotencyKey', { type: 'string', notNull: false }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('notification', 'notificationTypeKey', cb),
    (cb) => db.removeColumn('notification', 'eventKey', cb),
    (cb) => db.removeColumn('notification', 'context', cb),
    (cb) => db.removeColumn('notification', 'maxDeliveryCost', cb),
    (cb) => db.removeColumn('notification', 'scheduledAt', cb),
    (cb) => db.removeColumn('notification', 'idempotencyKey', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
