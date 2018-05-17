/**
 * Tags.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    id: {
      type: 'number',
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: 'string'
    },
    dishes: {
      collection: 'dish',
      via: 'tags'
    },

  },

};

