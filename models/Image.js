/**
 * Image.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    id: {
      type: 'string',
      primaryKey: true
    },
    images: {
      type: 'json'
    },
    dish: {
      model: 'dish',
      via: 'images'
    },
    group: {
      model: 'group',
      via: 'images'
    }
  }
};

