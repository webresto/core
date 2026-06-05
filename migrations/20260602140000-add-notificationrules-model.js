'use strict';

var async = require('async');
var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db, callback) {
  async.series([
    // Notification rules (a.k.a. notification types): event binding + delivery rules + templates.
    // Replaces the NOTIFICATION_TYPES settings JSON.
    (cb) => db.createTable('notificationrules', {
      columns: {
        id:                { type: 'text', primaryKey: true },
        key:               { type: 'text', notNull: true, unique: true },
        name:              { type: 'text', notNull: false },
        description:       { type: 'text', notNull: false },
        eventKey:          { type: 'text', notNull: true },
        enabled:           { type: 'boolean', notNull: false, defaultValue: false },
        priority:          { type: 'text', notNull: false, defaultValue: 'normal' },
        sendDelaySec:      { type: 'real', notNull: false, defaultValue: 0 },
        important:         { type: 'boolean', notNull: false, defaultValue: false },
        maxDeliveryCost:   { type: 'real', notNull: false },
        useGlobalFallback: { type: 'boolean', notNull: false, defaultValue: false },
        channelsMode:      { type: 'text', notNull: false, defaultValue: 'waterfall' },
        fixedChannels:     { type: 'text', notNull: false },
        defaultChannels:   { type: 'text', notNull: false },
        templates:         { type: 'text', notNull: false },
        createdAt:         { type: 'real', notNull: false },
        updatedAt:         { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),

    // Cleanup leftovers from the previous settings-based storage. The catalog now lives in
    // the notificationrules model; AVAILABLE_LOCALES is now derived from sails.config.i18n.
    (cb) => db.runSql(
      "DELETE FROM settings WHERE key IN ('NOTIFICATION_TYPES', 'AVAILABLE_LOCALES')",
      cb
    ),
  ], callback);
};

exports.down = function(db) {
  return db.dropTable('notificationrules');
};

exports._meta = {
  "version": 1
};
