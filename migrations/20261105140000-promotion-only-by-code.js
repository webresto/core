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
 * `promotion.onlyByCode` — the second switch of a promotion (C22, `marketing.plan.md`).
 *
 * `enable` used to mean "applies by itself", and a promo code applied a switched-off promotion all the same — so
 * "switched off" did not mean "does not apply", which is what the owner asked for. The two meanings are two
 * columns now: `enable` is "works at all", `onlyByCode` is "does not apply by itself".
 *
 * The column alone changes nothing: `false` is the behaviour every record already had. The records that relied on
 * the old meaning — off and linked to a code — are moved by `migrateOnlyByCode` (`lib/marketing/only-by-code.ts`)
 * at the first boot after this migration, once, which is remembered in the settings. That part is in TS and not in
 * SQL because it has to read the junction of promotions and codes and must also work on the stands that run on
 * sails-disk, where no db-migrate ever runs.
 */
exports.up = function (db, callback) {
  db.addColumn('promotion', 'onlyByCode', { type: 'boolean', notNull: false, defaultValue: false }, callback);
};

exports.down = function (db, callback) {
  db.removeColumn('promotion', 'onlyByCode', callback);
};

exports._meta = { version: 1 };
