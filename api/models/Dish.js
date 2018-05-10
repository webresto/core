/**
 * Dish.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    additionalInfo: {type: 'string'},
    code: {type: 'string'},
    description: {type: 'string'},
    id: {type: 'string'},
    isDeleted: {type: 'string'},
    name: {type: 'string'},
    seoDescription: {type: 'string'},
    seoKeywords: {type: 'string'},
    seoText: {type: 'string'},
    seoTitle: {type: 'string'},
    tags: {type: 'string'},
    carbohydrateAmount: {type: 'number'},
    carbohydrateFullAmount: {type: 'number'},
    differentPricesOn: {type: 'array'},
    doNotPrintInCheque: {type: 'boolean'},
    energyAmount: {type: 'number'},
    energyFullAmount: {type: 'number'},
    fatAmount: {type: 'number'},
    fatFullAmount: {type: 'number'},
    fiberAmount: {type: 'number'},
    fiberFullAmount: {type: 'number'},
    groupId: {type: 'string'},
    groupModifiers: {type: 'array'},
    measureUnit: {type: 'string'},
    modifiers: {type: 'array'},
    price: {type: 'number'},
    productCategoryId: {type: 'string'},
    prohibitedToSaleOn: {type: 'array'},
    type: {type: 'string'},
    useBalanceForSell: {type: 'boolean'},
    weight: {type: 'number'},
    images: {type: 'array'},
    isIncludedInMenu: {type: 'boolean'},
    order: {type: 'number'},
    parentGroup: {type: 'string'}

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

  },

};

