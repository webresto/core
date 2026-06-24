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
    (cb) => db.createTable('saleschannel', {
      columns: {
        id:                 { type: 'text', primaryKey: true },
        key:                { type: 'text', notNull: false },
        title:              { type: 'text', notNull: false },
        type:               { type: 'text', notNull: false, defaultValue: 'custom' },
        providerModule:     { type: 'text', notNull: false },
        enabled:            { type: 'boolean', notNull: false, defaultValue: false },
        status:             { type: 'text', notNull: false, defaultValue: 'draft' },
        countries:          { type: 'text', notNull: false },
        concepts:           { type: 'text', notNull: false },
        defaultConcept:     { type: 'text', notNull: false },
        allowConceptSwitch: { type: 'boolean', notNull: false, defaultValue: true },
        url:                { type: 'text', notNull: false },
        settings:           { type: 'text', notNull: false },
        publicConfig:       { type: 'text', notNull: false },
        secretsRef:         { type: 'text', notNull: false },
        sortOrder:          { type: 'real', notNull: false, defaultValue: 0 },
        createdAt:          { type: 'real', notNull: false },
        updatedAt:          { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),
  ], callback);
};

exports.down = function(db) {
  return db.dropTable('saleschannel');
};

exports._meta = {
  "version": 1
};
