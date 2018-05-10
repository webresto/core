/**
 * Groups.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    additionalInfo: {
      type: 'string',
      allowNull: true
    },
    code: {
      type: 'number',
      allowNull: true
    },
    description: {
      type: 'string',
      allowNull: true
    },
    isDeleted: {type: 'boolean'},
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
    tags: {type: 'json'},
    images: {type: 'json'},
    isIncludedInMenu: {type: 'boolean'},
    order: {type: 'number'},
    parentGroup: {
      type: 'string',
      allowNull: true
    }

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝


    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

  },

};

