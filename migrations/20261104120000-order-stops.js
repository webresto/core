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
 * `order_stop` — one row per point that has work to do for an order (plan C2).
 *
 * It exists so that "the orders of this point" is an indexed query: `order` has no column naming
 * the point it is led by, because a delivery keeps its kitchens in a json list (`cookingPoints`)
 * and pickup keeps the point the customer chose. Until this table the mobile API and the board read
 * a window of the whole chain and filtered it in memory.
 *
 * `place` is nullable on purpose: a delivery no kitchen has been resolved for has one stop with no
 * point, and that is «Без кухни» of the board and of the phone.
 *
 * Types follow 20260827120000-multi-kitchen: `createdAt`/`updatedAt` are `bigint` (Waterline's
 * autoCreatedAt, which sails-postgresql turns back into numbers), and the epoch copies of the order
 * are `double precision` — the same as `order.orderedAt` and `order.completedAt`, which hold epoch
 * *seconds*. Associations are plain text keys with a foreign key, as everywhere in this schema.
 *
 * The rows themselves are not written here: `backfillOrderStops` fills the active orders and those
 * completed within 30 days at the first boot after this migration, from the orders' own fields. A
 * SQL backfill would have to parse `cookingPoints` json, and that logic lives in one place —
 * `lib/order/order-stops.ts`.
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.createTable('order_stop', {
      columns: {
        id: { type: 'text', primaryKey: true },
        // `order` is a reserved word; the driver quotes it, as Waterline does for the attribute.
        order: { type: 'text', notNull: true },
        place: { type: 'text', notNull: false },
        position: { type: 'int', notNull: true, defaultValue: 0 },
        partState: { type: 'text', notNull: false },
        readyBy: { type: 'double precision', notNull: false },
        orderState: { type: 'text', notNull: true },
        orderedAt: { type: 'double precision', notNull: false },
        completedAt: { type: 'double precision', notNull: false },
        createdAt: { type: 'bigint', notNull: false },
        updatedAt: { type: 'bigint', notNull: false },
      },
    }, cb),

    // The three ways a stop is ever looked up: the active board of a point, its finished tab, and
    // everything of one order (the sync writes by this one).
    (cb) => db.addIndex('order_stop', 'order_stop_place_state_idx', ['place', 'orderState'], false, cb),
    (cb) => db.addIndex('order_stop', 'order_stop_place_completed_idx', ['place', 'completedAt'], false, cb),
    (cb) => db.addIndex('order_stop', 'order_stop_order_idx', ['order'], false, cb),
    // One row per point per position of an order: the sync upserts by that pair.
    (cb) => db.addIndex('order_stop', 'order_stop_order_position_unique', ['order', 'position'], true, cb),

    (cb) => db.addForeignKey('order_stop', 'order', 'order_stop_order_fk',
      { order: 'id' }, { onDelete: 'CASCADE', onUpdate: 'NO ACTION' }, cb),
    // A point that is deleted leaves its orders where an operator can still see them — «Без кухни».
    (cb) => db.addForeignKey('order_stop', 'place', 'order_stop_place_fk',
      { place: 'id' }, { onDelete: 'SET NULL', onUpdate: 'NO ACTION' }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  db.dropTable('order_stop', callback);
};

exports._meta = {
  "version": 1
};
