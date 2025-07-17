"use strict";

var async = require("async");
var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db, callback) {
  async.series([
    (cb) => db.addColumn("dish", "notForSale", { type: "boolean", defaultValue: false }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn("dish", "notForSale", cb),
  ], callback);
};

exports._meta = {
  version: 1,
};
