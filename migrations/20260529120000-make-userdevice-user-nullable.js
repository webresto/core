'use strict';

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// A UserDevice always exists on the client side, but it gets bound to a user only after login.
// Allow the "user" column to be NULL so anonymous (guest) devices can be stored.
// The column type ("text") is kept as is — only the NOT NULL constraint is changed.
exports.up = function (db, callback) {
  db.changeColumn('userdevice', 'user', { type: 'text', notNull: false }, callback);
};

exports.down = function (db, callback) {
  db.changeColumn('userdevice', 'user', { type: 'text', notNull: true }, callback);
};

exports._meta = {
  "version": 1
};
