/**
 * CartDish.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true
    },
    amount: {
      type: 'integer'
    },
    dish: {
      model: 'Dish'
    },
    modifiers: {
      type: 'json'
    },
    cart: {
      model: 'Cart',
      via: 'items'
    },
    parent: {
      model: 'CartDish',
      via: 'modifiers'
    },
    uniqueItems: {
      type: 'integer'
    },
    itemTotal: {
      type: 'integer'
    }

  },

}
;

