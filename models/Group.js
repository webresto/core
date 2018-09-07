/**
 * Group.js
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
    code: {type: 'float'},
    description: {type: 'string'},
    isDeleted: {type: 'boolean'},
    name: {type: 'string'},
    seoDescription: {type: 'string'},
    seoKeywords: {type: 'string'},
    seoText: {type: 'string'},
    seoTitle: {type: 'string'},
    tags: {collection: 'tags'},
    isIncludedInMenu: {type: 'boolean'},
    order: {type: 'float'},
    dishesTags: {
      collection: 'tags'
    },
    dishes: {
      collection: 'dish',
      via: 'productCategoryId'
    },
    parentGroup: {
      model: 'group'
    },
    childGroups: {
      collection: 'group',
      via: 'parentGroup'
    },
    images: {
      collection: 'image',
      via: 'group'
    },

  },

  createOrUpdate: function (values) {
    return {
      exec: function (cb) {
        Group.findOne({id: values.id}).exec((err, group) => {
          if (err) return cb(err);
          if (!group) {
            Group.create(values).exec((err, group) => {
              if (err) return cb(err);
            });
          } else {
            Group.update({id: values.id}, values).exec((err, group) => {
              if (err) return cb(err);
            });
          }
        });
      }
    }
  }
};

