/**
 * Dish.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    id: {
      type: 'string',
      required: true,
      primaryKey: true
    },
    additionalInfo: {type: 'string'},
    code: {type: 'string'},
    description: {type: 'string'},
    name: {type: 'string'},
    seoDescription: {type: 'string'},
    seoKeywords: {type: 'string'},
    seoText: {type: 'string'},
    seoTitle: {type: 'string'},
    carbohydrateAmount: {type: 'float'},
    carbohydrateFullAmount: {type: 'float'},
    differentPricesOn: {type: 'json'},
    doNotPrintInCheque: {type: 'boolean'},
    energyAmount: {type: 'float'},
    energyFullAmount: {type: 'float'},
    fatAmount: {type: 'float'},
    fatFullAmount: {type: 'float'},
    fiberAmount: {type: 'float'},
    fiberFullAmount: {type: 'float'},
    groupId: {type: 'string'},
    groupModifiers: {type: 'json'},
    measureUnit: {type: 'string'},
    price: {type: 'float'},
    productCategoryId: {type: 'string'},
    prohibitedToSaleOn: {type: 'json'},
    type: {type: 'string'},
    useBalanceForSell: {type: 'boolean'},
    weight: {type: 'float'},
    images: {type: 'json'},
    isIncludedInMenu: {type: 'boolean'},
    order: {type: 'float'},
    isDeleted: {type: 'boolean'},
    modifiers: {
      collection: 'dish'
    },
    parentGroup: {
      model: 'group'
    },
    tags: {
      collection: 'tags',
      via: 'dishes'
    },

  },

};
