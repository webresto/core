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

exports.up = function (db, callback) {
  async.series([
    // First, check if table exists, then fix id column
    (cb) => db.runSql(
      `DO $$
       BEGIN
         -- Check if table exists first
         IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_name = 'selectedmediafile') THEN

           -- If id column doesn't exist, create it as SERIAL
           IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'selectedmediafile' AND column_name = 'id') THEN
             -- Add id column as SERIAL (will auto-assign IDs to existing rows)
             ALTER TABLE selectedmediafile ADD COLUMN id SERIAL PRIMARY KEY;
           ELSE
             -- If id column exists but is not primary key, fix it
             -- First drop any existing constraint
             ALTER TABLE selectedmediafile DROP CONSTRAINT IF EXISTS selectedmediafile_pkey;

             -- Convert existing column to SERIAL and make it primary key
             -- Create sequence if not exists
             CREATE SEQUENCE IF NOT EXISTS selectedmediafile_id_seq;

             -- Update NULL ids with sequence values
             UPDATE selectedmediafile SET id = nextval('selectedmediafile_id_seq') WHERE id IS NULL;

             -- Alter column to use sequence
             ALTER TABLE selectedmediafile ALTER COLUMN id SET DEFAULT nextval('selectedmediafile_id_seq');
             ALTER TABLE selectedmediafile ALTER COLUMN id SET NOT NULL;

             -- Set sequence to max id + 1
             PERFORM setval('selectedmediafile_id_seq', COALESCE((SELECT MAX(id) FROM selectedmediafile), 0) + 1, false);

             -- Add primary key constraint
             ALTER TABLE selectedmediafile ADD PRIMARY KEY (id);
           END IF;

         END IF;
         -- If table doesn't exist, do nothing (it will be created by Waterline or another migration)
       END $$;`,
      cb
    ),
  ], callback);
};

exports.down = function(db, callback) {
  async.series([
    (cb) => db.removeColumn('selectedmediafile', 'id', cb)
  ], callback);
};

exports._meta = {
  "version": 1
};
