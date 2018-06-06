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
    productCategoryId: {model: 'group'},
    prohibitedToSaleOn: {type: 'array'},
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
    }

  },

  /**
   * Get dishes by groups
   * @param groupsId
   * @param cb
   * @return {Promise<>}
   */
  getByGroupId: function (groupsId, cb) {
    let result = [];
    return new Promise((resolve, reject) => {
      if (Array.isArray(groupsId)) {
        let arr = [];
        for (let i = 0; i < groupsId.length; i++)
          arr.push(this.getByGroupId(groupsId[i]));
        Promise.all(arr).then(data => {
          resolve(data);
        })
      } else {
        if (groupsId) {
          Group.findOne({id: groupsId}).populate(['dishes', 'childGroups']).exec((err, group) => {
            if (err) return reject({error: err});
            if (!group) return reject({error: 'not found'});

            Dish.getDishes().then(dishes => {
              group.dishes = dishes;

              if (cb) {
                result.push(data);
                cb();
              }
              return resolve(group);
            });
          });
        } else {
          let menu = {};
          Group.find({parentGroup: null}).populate(['childGroups', 'dishes', 'dishesTags']).exec((err, groups) => {
            if (err) return reject({error: err});

            async.each(groups, (group, cb) => {
              menu[group.id] = group;
              Dish.find({parentGroup: group.id, isDeleted: false}).populate('tags').exec((err, dishes) => {
                if (err) return reject({error: err});

                menu[group.id].dishes = dishes;

                if (dishes.length > 0)
                  async.eachOf(dishes, (dish, i, cb) => {
                    menu[group.id].dishes[i].tags = dish.tags;
                    cb();
                  }, cb);
                else
                  cb();
              });
            }, function () {
              if (cb) {
                result.push(data);
                cb();
              }
              resolve(menu);
            });
          });
        }
      }
    });
  },

  /**
   * Get only not deleted dishes
   * @param criteria
   */
  getDishes: function (criteria) {
    return new Promise((resolve, reject) => {
      if (!criteria)
        criteria = {};
      criteria.isDeleted = false;
      Dish.find(criteria).populate('tags').exec((err, dishes) => {
        if (err) reject(err);
        resolve(dishes);
      });
    });
  }
};
