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

    id: {
      type: 'string',
      required: true
    },
    additionalInfo: {
      type: 'string',
      allowNull: true
    },
    code: {type: 'string'},
    description: {type: 'string'},
    isDeleted: {type: 'string'},
    name: {type: 'string'},
    seoDescription: {
      type: 'string',
      allowNull: true
    },
    seoKeywords: {
      type: 'string',
      allowNull: true
    },
    seoText: {
      type: 'string',
      allowNull: true
    },
    seoTitle: {
      type: 'string',
      allowNull: true
    },
    tags: {
      collection: 'tags',
      via: 'dishes'
    },
    carbohydrateAmount: {type: 'number'},
    carbohydrateFullAmount: {type: 'number'},
    differentPricesOn: {type: 'json'},
    doNotPrintInCheque: {type: 'boolean'},
    energyAmount: {type: 'number'},
    energyFullAmount: {type: 'number'},
    fatAmount: {type: 'number'},
    fatFullAmount: {type: 'number'},
    fiberAmount: {type: 'number'},
    fiberFullAmount: {type: 'number'},
    groupId: {
      type: 'string',
      allowNull: true
    },
    groupModifiers: {type: 'json'},
    measureUnit: {type: 'string'},
    price: {type: 'number'},
    productCategoryId: {
      type: 'string',
      allowNull: true
    },
    prohibitedToSaleOn: {type: 'json'},
    type: {type: 'string'},
    useBalanceForSell: {type: 'boolean'},
    weight: {type: 'number'},
    images: {type: 'json'},
    isIncludedInMenu: {type: 'boolean'},
    order: {type: 'number'},
    isDeleted: {type: 'boolean'},

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝
    modifiers: {
      collection: 'dish'
    },
    parentGroup: {
      model: 'group'
    }

  },

};
