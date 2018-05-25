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
    differentPricesOn: {type: 'array'},
    doNotPrintInCheque: {type: 'boolean'},
    energyAmount: {type: 'float'},
    energyFullAmount: {type: 'float'},
    fatAmount: {type: 'float'},
    fatFullAmount: {type: 'float'},
    fiberAmount: {type: 'float'},
    fiberFullAmount: {type: 'float'},
    groupId: {type: 'string'},
    groupModifiers: {type: 'array'},
    measureUnit: {type: 'string'},
    price: {type: 'float'},
    productCategoryId: {type: 'string'},
    prohibitedToSaleOn: {type: 'array'},
    type: {type: 'string'},
    useBalanceForSell: {type: 'boolean'},
    weight: {type: 'float'},
    images: {type: 'json'},
    isIncludedInMenu: {type: 'boolean'},
    order: {type: 'float'},
    isDeleted: {type: 'boolean'},
    modifiers: {
      collection: 'dish',
      via: 'parentDish'
    },
    parentGroup: {
      model: 'group'
    },
    tags: {
      collection: 'tags',
      via: 'dishes'
    },
    parentDish: {
      model: 'dish',
      via: 'modifiers'
    }

  },

  getByGroupId: function (groupsId) {
    if (Array.isArray(groupsId)) {
      let result = [];
      for (let i = 0; i < groupsId.leading; i++)
        result.push(this.getByGroupId(groupsId[i]));
      return result;
    } else {
      return new Promise((resolve, reject) => {
        if (groupId) {
          Group.findOne({id: groupId}).populate(['dishes', 'childGroups']).exec((err, group) => {
            if (err) return reject({error: err});
            if (!group) return reject({error: 'not found'});

            return resolve(group);
          });
        } else {
          let menu = {};
          Group.find({parentGroup: null}).populate(['childGroups', 'dishes', 'dishesTags']).exec((err, groups) => {
            if (err) return reject({error: err});

            async.each(groups, (group, cb) => {
              menu[group.id] = {};
              menu[group.id].tags = group.dishesTags;
              if (group.dishes.length === 0) {
                menu[group.id].groups = group.childGroups;
                cb();
              }
              else {
                Dish.find({parentGroup: group.id, isDeleted: false}).populate('tags').exec((err, dishes) => {
                  if (err) return reject({error: err});

                  menu[group.id].dishes = dishes;
                  cb();
                });
              }
            }, function () {
              resolve(menu);
            });
          });
        }
      });
    }
  }
};
