/**
 * CartDish.js
 *
 * @description :: A model definition. Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    id: {
      type: 'string',
      required: true,
      primaryKey: true
    },
    name: {
      type: 'string'
    },
    classifierId: {
      type: 'string'
    }

  },

};

