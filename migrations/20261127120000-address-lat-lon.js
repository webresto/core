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
 * Address.lat, Address.lon: the coordinate of `point` as numbers, for "the nodes near a point" by an index - a click on
 * the map, a house a geocoder found. The json `point` stays the one the catalog keeps; the model writes these from it
 * on every create and update. Without them a click read the whole catalog of the city (34 thousand rows on the HP
 * server, ~0.5-1.5 s of the parsing in Node, the server answered nobody meanwhile).
 *
 * `double precision`: `real` is float4, ~7 digits - a degree of 56.8334567 would be rounded to meters (as epochs were,
 * 20261103120000-epoch-columns-not-real); db-migrate has no name for float8 and passes it through as written.
 *
 * The backfill reads the json of `point`, which db-migrate cannot express - runSql. A node without a point (a street,
 * a quarter) keeps null, and so would a point without numbers (the model never writes one).
 */
exports.up = function (db, callback) {
  async.series([
    (cb) => db.addColumn('address', 'lat', { type: 'double precision', notNull: false }, cb),
    (cb) => db.addColumn('address', 'lon', { type: 'double precision', notNull: false }, cb),
    (cb) => db.runSql(`UPDATE "address" SET "lat" = ("point"->>'lat')::double precision, "lon" = ("point"->>'lon')::double precision WHERE json_typeof("point") = 'object' AND json_typeof("point"->'lat') = 'number' AND json_typeof("point"->'lon') = 'number'`, cb),
    // "the nodes of a city near a point": the city, then a band of latitude; the longitude is checked within the band
    (cb) => db.addIndex('address', 'address_city_lat', ['city', 'lat'], false, cb),
  ], callback);
};

exports.down = function (db, callback) {
  async.series([
    (cb) => db.removeIndex('address', 'address_city_lat', cb),
    (cb) => db.removeColumn('address', 'lon', cb),
    (cb) => db.removeColumn('address', 'lat', cb),
  ], callback);
};

exports._meta = {
  "version": 1
};
