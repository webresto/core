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
 * Multi-kitchen, in one migration.
 *
 * This replaces the fourteen migrations the programme accumulated. None of them
 * ever ran anywhere, so there is no installed schema to reconcile with and no
 * data to repair: every backfill, every `IF NOT EXISTS`, every de-duplication
 * pass they carried was insurance against a state that cannot exist. What is
 * left is the schema the models describe.
 *
 * Timestamps are `bigint`, matching the initial schema. Waterline writes epoch
 * milliseconds into `autoCreatedAt`, and `real` is float4 — seven significant
 * digits against the thirteen such a value needs.
 */

exports.up = function (db, callback) {
  async.series([
    // --- place: where it is, and who it is to an RMS ------------------------
    (cb) => db.addColumn('place', 'coordinate', { type: 'json', notNull: false }, cb),
    (cb) => db.addColumn('place', 'rmsId', { type: 'text', notNull: false }, cb),

    // --- dish: how long it takes to cook -----------------------------------
    (cb) => db.addColumn('dish', 'cookingTimeMax', { type: 'int', notNull: false }, cb),

    // Stock stopped being a property of the product and became one of the pair
    // "product + cooking point". The column has no model attribute behind it any
    // more; `Dish.balance` in the API is computed per request.
    (cb) => db.removeColumn('dish', 'balance', cb),

    // --- dish_place: stock at one cooking point -------------------------
    //
    // A product with no row here is sold everywhere without a limit. Rows appear
    // when a source supplies a real value, which is why nothing is pre-created.
    (cb) => db.createTable('dish_place', {
      columns: {
        id: { type: 'text', primaryKey: true },
        dish: { type: 'text', notNull: true },
        place: { type: 'text', notNull: true },
        localBalance: { type: 'real', notNull: false },
        rmsBalance: { type: 'real', notNull: false },
        enable: { type: 'boolean', notNull: true, defaultValue: true },
        createdAt: { type: 'bigint', notNull: false },
        updatedAt: { type: 'bigint', notNull: false },
      },
    }, cb),
    (cb) => db.addIndex('dish_place', 'dish_place_dish_place_unique', ['dish', 'place'], true, cb),
    (cb) => db.addForeignKey('dish_place', 'dish', 'dish_place_dish_fk',
      { dish: 'id' }, { onDelete: 'CASCADE', onUpdate: 'NO ACTION' }, cb),
    (cb) => db.addForeignKey('dish_place', 'place', 'dish_place_place_fk',
      { place: 'id' }, { onDelete: 'CASCADE', onUpdate: 'NO ACTION' }, cb),

    // --- deliveryzone: the map core now owns -------------------------------
    //
    // No foreign key on `placeId` or `city` on purpose: deleting a cooking point
    // must not delete the polygon and tariff an operator entered by hand.
    (cb) => db.createTable('deliveryzone', {
      columns: {
        id: { type: 'text', primaryKey: true },
        name: { type: 'text', notNull: false },
        description: { type: 'text', notNull: false },
        hash: { type: 'text', notNull: false },
        sortOrder: { type: 'real', notNull: false },
        enable: { type: 'boolean', notNull: false, defaultValue: true },
        worktime: { type: 'json', notNull: false },
        minDeliveryTime: { type: 'real', notNull: false },
        minOrderTotal: { type: 'real', notNull: false },
        freeDeliveryFrom: { type: 'real', notNull: false },
        deliveryCost: { type: 'real', notNull: false },
        deliveryItem: { type: 'text', notNull: false },
        deliveryMessage: { type: 'text', notNull: false },
        polygon: { type: 'json', notNull: false },
        // Self-reference: a row with a parent is a polygon inside a layer, a row
        // without a polygon and with children is the layer. No foreign key — the
        // same reason as `placeId` and `city` below: Waterline stores a singular
        // association as plain text and this schema declares no constraint for those.
        parent: { type: 'text', notNull: false },
        // Whether the layer above prices the zones under it, or only groups
        // them. Read on layer rows only; a zone carries the default and nobody
        // looks at it.
        termsApplyToZones: { type: 'boolean', notNull: false, defaultValue: true },
        customData: { type: 'json', notNull: false },
        city: { type: 'text', notNull: false },
        source: { type: 'text', notNull: false },
        externalId: { type: 'text', notNull: false },
        sourceHash: { type: 'text', notNull: false },
        sourceUpdatedAt: { type: 'text', notNull: false },

        lastSyncedAt: { type: 'bigint', notNull: false },
        missingFromSourceAt: { type: 'bigint', notNull: false },
        createdAt: { type: 'bigint', notNull: false },
        updatedAt: { type: 'bigint', notNull: false },
      },
    }, cb),

    // Zones are read on every delivery calculation and matched in sortOrder.
    (cb) => db.addIndex('deliveryzone', 'deliveryzone_enable_sort_order', ['enable', 'sortOrder'], false, cb),
    // Exactly the lookup the import runs: everything this source owns in this city.
    (cb) => db.addIndex('deliveryzone', 'deliveryzone_source_city', ['source', 'city'], false, cb),

    // --- order: which kitchen, how long the customer will wait -------------
    //
    // `cookingPoint` is plain text like the `pickupPoint` that has always been
    // there: Waterline stores a singular association as the foreign primary key,
    // and this schema declares no constraint for those.
    //
    // `cookingPoints` is json rather than a join table. It is an ordered list of
    // stops belonging to one order — read whole, written whole, never queried by
    // member.
    (cb) => db.addColumn('order', 'cookingPoint', { type: 'text', notNull: false }, cb),
    (cb) => db.addColumn('order', 'cookingPoints', { type: 'json', notNull: false }, cb),

    (cb) => db.addColumn('order', 'maxWaitMinutes', { type: 'int', notNull: false }, cb),

    // --- orderdish: which kitchen cooks this line --------------------------
    (cb) => db.addColumn('orderdish', 'cookingPoint', { type: 'text', notNull: false }, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeColumn('orderdish', 'cookingPoint', cb),

    (cb) => db.removeColumn('order', 'maxWaitMinutes', cb),


    (cb) => db.removeColumn('order', 'cookingPoints', cb),
    (cb) => db.removeColumn('order', 'cookingPoint', cb),

    // Dropping a table drops its indexes and constraints with it.

    (cb) => db.dropTable('deliveryzone', cb),
    (cb) => db.dropTable('dish_place', cb),

    (cb) => db.addColumn('dish', 'balance', { type: 'real', notNull: false }, cb),
    (cb) => db.removeColumn('dish', 'cookingTimeMax', cb),

    (cb) => db.removeColumn('place', 'rmsId', cb),
    (cb) => db.removeColumn('place', 'coordinate', cb),
  ], callback);
};

exports._meta = { version: 1 };
