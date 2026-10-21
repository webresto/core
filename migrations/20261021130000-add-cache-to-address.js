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
 * Address.cache: a node a geocoder found, not one of ours. null — our node (a file, the admin
 * panel, an RMS); { source, street } — the geocoder that found it and its street line, by which an
 * upload attaches the house to the new street. An upload deletes only the nodes with null.
 * null — the correct backfill: every existing node is ours.
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.addColumn('address', 'cache', { type: 'json', notNull: false }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('address', 'cache', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
