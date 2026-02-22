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
    (cb) => db.addColumn("dish", "enable", { type: "boolean", defaultValue: true }, cb),
    (cb) => db.addColumn("group", "enable", { type: "boolean", defaultValue: true }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn("dish", "enable", cb),
    (cb) => db.removeColumn("group", "enable", cb),
  ], callback);
};

exports._meta = {
  version: 1,
};
