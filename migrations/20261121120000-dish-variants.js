'use strict';

var async = require('async');
var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

/**
 * A dish with variants (`interfaces/Variants.ts`): the box and its variants are rows of `dish`.
 *
 * `dish.parentId` — of a variant, the id of its box. A column and not a key of the box's json:
 * the variants lie in the box's group, and the menu, the catalog and the lists leave them out by
 * a condition of the query.
 * `dish.variants` — of a box, its attributes and the table of its variants.
 * `orderdish.parentDish` — the box of the variant an order line holds: `orderdish.dish` is the
 * variant, the box is kept for history and display.
 *
 * `null` is the correct backfill of all three: no dish has variants yet. Plain text keys without
 * a foreign key, as `orderdish.dish` and `dish.parentGroup` are.
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.addColumn('dish', 'parentId', { type: 'text', notNull: false }, cb),
    (cb) => db.addColumn('dish', 'variants', { type: 'json', notNull: false }, cb),
    (cb) => db.addColumn('orderdish', 'parentDish', { type: 'text', notNull: false }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('orderdish', 'parentDish', cb),
    (cb) => db.removeColumn('dish', 'variants', cb),
    (cb) => db.removeColumn('dish', 'parentId', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
