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
    (cb) => db.addColumn('userdevice', 'notificationToken', { type: 'text', notNull: false }, cb),
  ], callback);
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
