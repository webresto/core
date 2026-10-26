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
 * DeliveryZone.worktime: zones have no hours - only kitchens do (Place.worktime). The hours of a zone are dropped
 * with the column; down brings the column back empty.
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('deliveryzone', 'worktime', cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.addColumn('deliveryzone', 'worktime', { type: 'json', notNull: false }, cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
