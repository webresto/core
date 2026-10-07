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
 * PaymentDocument.supersededAt (seconds since 1970): the payment was detached from its order
 * because the basket changed and the gateway could not cancel it (see PaymentDocument.invalidate).
 * null — the correct backfill: existing documents were never superseded.
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.addColumn('paymentdocument', 'supersededAt', { type: 'bigint', notNull: false }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('paymentdocument', 'supersededAt', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
