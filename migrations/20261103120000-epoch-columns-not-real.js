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
 * The tables of auth v2, notifications, sales channels and devices were created with epoch milliseconds in `real`
 * columns. `real` is float4: a value of 1.79e12 keeps 24 bits and is rounded to 131 s. On Postgres the attempt of a
 * login saw its code sent a minute earlier than it was - "asking again within the pause" opened a new attempt with
 * a new code, and the countdowns of the client were off by up to two minutes. sails-disk keeps the number as it is,
 * which is why the tests of the core did not see it.
 *
 * The types follow 20260827120000-multi-kitchen: autoCreatedAt/autoUpdatedAt are `bigint` (sails-postgresql turns
 * them back into numbers), any other epoch millisecond is `double precision` (`bigint` of a plain `number` comes back
 * a string; float8 holds the value exactly). db-migrate has no name for float8 and passes it through as written.
 *
 * changeColumn of db-migrate-pg casts the values itself (USING "<column>"::<type>); the columns were nullable
 * without a default and stay so.
 */
const TIMESTAMPS = ['createdAt', 'updatedAt'];
const COLUMNS = {
  authattempt: { bigint: TIMESTAMPS, 'double precision': ['expiresAt', 'secretExpiresAt', 'sentAt', 'ticketConsumedAt'] },
  authsendlog: { bigint: TIMESTAMPS, 'double precision': ['at'] },
  authidentity: { bigint: TIMESTAMPS, 'double precision': ['linkedAt', 'lastUsedAt'] },
  authmethod: { bigint: TIMESTAMPS },
  notification: { bigint: TIMESTAMPS, 'double precision': ['readAt', 'scheduledAt', 'deliveredAt'] },
  notificationrules: { bigint: TIMESTAMPS },
  saleschannel: { bigint: TIMESTAMPS },
  userdevice: { 'double precision': ['loginTime', 'lastActivity'] },
};

const changeTo = (db, typeOf) => Object.entries(COLUMNS).flatMap(([table, types]) =>
  Object.entries(types).flatMap(([type, columns]) =>
    columns.map((column) => (cb) => db.changeColumn(table, column, { type: typeOf(type), notNull: false }, cb))
  )
);

exports.up = function (db, callback) {
  async.series(changeTo(db, (type) => type), callback);
};

exports.down = function (db, callback) {
  async.series(changeTo(db, () => 'real'), callback);
};

exports._meta = {
  "version": 1
};
