/**
 * WRONG SAILS HACK
 */

console.warn("WRONG SAILS HACK v0.1");

const replace = require("replace-in-file");

/**
 * 1.
 * Patch for allow unknow types
 * bash equals: find $PWD/node_modules/waterline-schema/ -type f -print0 | xargs -0 sed -i 's|if (_.indexOf(validProperties, propertyName) < 0) {|if (false) {|g'
 */
console.log(__dirname + "../../node_modules/**/waterline-schema/schema.js");
const results = replace.sync({
  files: [
    __dirname + "/../../../node_modules/**/waterline-schema/schema.js", 
    __dirname + "/../../../node_modules/**/sails-hook-orm/lib/validate-model-def.js",
    __dirname + "/../../../node_modules/sails-disk/index.js", 


    //for test system
    __dirname + "/../**/sails-hook-orm/lib/validate-model-def.js", 
    __dirname + "/../**/waterline-schema/schema.js",
    __dirname + "/../**/sails-disk/index.js" 
  ], 
  from: [
    "(_.isFunction(val.defaultsTo))",
    "(_.indexOf(validProperties, propertyName) < 0)",
    "(_.has(attribute, 'defaultsTo') && _.isNull(attribute.defaultsTo))",
    "(_.has(primaryKeyAttribute, 'defaultsTo') && !_.isUndefined(primaryKeyAttribute, 'defaultsTo'))",
    "(attribute.required && _.has(attribute, 'defaultsTo') && !_.isUndefined(attribute, 'defaultsTo'))",
    "(_.has(attribute, 'defaultsTo'))",
    "(primaryKeyAttr.required !== true && (!primaryKeyAttr.autoMigrations || primaryKeyAttr.autoMigrations.autoIncrement !== true))"
  ],
  to: "(false)",
});

console.log(results);
