/**
 * WRONG SAILS HACK
 */

 console.warn("WRONG SAILS HACK v0.2");
 let PWD = process.cwd()
 const replace = require("replace-in-file");
 
 /**
  * 1.
  * Patch for allow unknow types
  * bash equals: find $PWD/node_modules/waterline-schema/ -type f -print0 | xargs -0 sed -i 's|if (_.indexOf(validProperties, propertyName) < 0) {|if (false) {|g'
  */
 console.log(PWD + "/../**/sails-hook-orm/lib/validate-model-def.js",);
 const results = replace.sync({
   files: [
     //for test system
     PWD + "/../**/sails-hook-orm/lib/validate-model-def.js", 
     PWD + "/../**/waterline-schema/schema.js",
     PWD + "/../**/sails-disk/index.js",
     PWD + "/../**/query/private/normalize-value-to-set.js", 
  
   ], 
   from: [
     "(_.isFunction(val.defaultsTo))",
     "(_.indexOf(validProperties, propertyName) < 0)",
     "(_.has(attribute, 'defaultsTo') && _.isNull(attribute.defaultsTo))",
     "(_.has(primaryKeyAttribute, 'defaultsTo') && !_.isUndefined(primaryKeyAttribute, 'defaultsTo'))",
     "(attribute.required && _.has(attribute, 'defaultsTo') && !_.isUndefined(attribute, 'defaultsTo'))",
     "(_.has(attribute, 'defaultsTo'))",
     "(isProvidingNullForIncompatibleOptionalAttr)",
     "(primaryKeyAttr.required !== true && (!primaryKeyAttr.autoMigrations || primaryKeyAttr.autoMigrations.autoIncrement !== true))"
   ],
   to: "(false)",
 });
 
 console.log(results);
 
 // Stranger things