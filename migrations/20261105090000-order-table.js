'use strict';

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

/**
 * `order.table` — the table a dine-in order is served at, as the venue calls it ("12", "У окна").
 *
 * A text column and not a relation: there is no directory of tables yet, and the owner's call was
 * to have the field now and the directory later (order-entry.plan.md, C12a). Nullable, because
 * delivery and pickup have none.
 */
exports.up = function (db, callback) {
  db.addColumn('order', 'table', { type: 'text' }, callback);
};

exports.down = function (db, callback) {
  db.removeColumn('order', 'table', callback);
};

exports._meta = { version: 1 };
