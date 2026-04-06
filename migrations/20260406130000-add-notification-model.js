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
    (cb) => db.createTable('notification', {
      columns: {
        id:        { type: 'text', primaryKey: true },
        user:      { type: 'text', notNull: false },
        title:     { type: 'text', notNull: false },
        body:      { type: 'text', notNull: false },
        data:      { type: 'text', notNull: false },
        status:    { type: 'text', notNull: false, defaultValue: 'pending' },
        groupTo:   { type: 'text', notNull: false, defaultValue: 'user' },
        readAt:    { type: 'real', notNull: false },
        channels:  { type: 'text', notNull: false },
        logs:      { type: 'text', notNull: false },
        badge:     { type: 'text', notNull: false, defaultValue: 'info' },
        createdAt: { type: 'real', notNull: false },
        updatedAt: { type: 'real', notNull: false },
      },
      ifNotExists: true,
    }, cb),
  ], callback);
};

exports.down = function(db) {
  return db.dropTable('notification');
};

exports._meta = {
  "version": 1
};
