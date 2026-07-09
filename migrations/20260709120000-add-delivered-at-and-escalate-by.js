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
    // Delivery acknowledgement timestamp (ms), parallel to readAt (see models/Notification.ts).
    // null means "no ack yet", which is the correct backfill for existing rows: no provider
    // confirms delivery to the server, so historic notifications simply have no ack.
    (cb) => db.addColumn('notification', 'deliveredAt', { type: 'real', notNull: false }, cb),
    // Which ack stops the unread-escalation waterfall: 'read' (default, current behavior)
    // or 'delivered' (see models/NotificationRules.ts). defaultValue backfills existing
    // rules with 'read' so nothing changes until an operator flips the switch.
    (cb) => db.addColumn('notificationrules', 'escalateBy', { type: 'text', notNull: false, defaultValue: 'read' }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('notificationrules', 'escalateBy', cb),
    (cb) => db.removeColumn('notification', 'deliveredAt', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
