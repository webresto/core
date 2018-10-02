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
    isIncludedInMenu: {type: 'boolean'},
    order: {type: 'float'},
    isDeleted: {type: 'boolean'},
    modifiers: {
      // collection: 'dish'
      type: 'json'
    },
    parentGroup: {
      model: 'group'
    },
    tags: {
      collection: 'tags',
      via: 'dishes',
      dominant: true
    },
    balance: {
      type: 'integer',
      defaultsTo: -1
    },
    images: {
      collection: 'image',
      via: 'dish'
    },
    itemTotal: 'integer',
    slug: {
      type: 'slug',
      from: 'name'
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
          Group.findOne({id: groupsId}).populate(['dishes', 'childGroups', 'dishesTags', 'images']).exec((err, group) => {
            if (err) return reject({error: err});
            if (!group) return reject({error: 'not found'});

            const loadDishes = cb => {
              Dish.getDishes({parentGroup: groupsId}).then(dishes => {
                group.dishesList = dishes;
                async.eachOf(dishes, (dish, i, cb) => {
                  group.dishesList[i].tagsList = dish.tags;
                  group.dishesList[i].imagesList = dish.images;
                  cb();
                });

                if (cb) {
                  result.push(data);
                  cb();
                }
                return resolve(group);
              });
            };

            if (group.childGroups) {
              let childGroups = [];
              async.each(group.childGroups, (cg, cb1) => {
                this.getByGroupId(cg.id).then(data => {
                  childGroups.push(data);
                  cb1();
                }, err => sails.log.error(err));
              }, () => {
                delete group.childGroups;
                group.children = childGroups;
                loadDishes(cb);
              });
            } else
              loadDishes(cb);
          });
        } else {
          let menu = {};
          Group.find({parentGroup: null}).populate(['childGroups', 'dishes', 'dishesTags', 'images']).exec((err, groups) => {
            if (err) return reject({error: err});

            async.each(groups, (group, cb) => {
              menu[group.id] = group;

              const loadDishes = function (cb) {
                Dish.getDishes({parentGroup: group.id}).then(dishes => {
                  menu[group.id].dishesList = dishes;

                  if (dishes.length > 0)
                    async.eachOf(dishes, (dish, i, cb) => {
                      menu[group.id].dishesList[i].tagsList = dish.tags;
                      menu[group.id].dishesList[i].imagesList = dish.images;
                      cb();
                    }, cb);
                  else
                    cb();
                }, err => {
                  return reject({error: err});
                });
              };

              if (group.childGroups) {
                let childGroups = [];
                Group.find({id: group.childGroups.map(cg => cg.id)}).populate(['childGroups', 'dishes', 'dishesTags', 'images']).exec((err, cgs) => {
                  if (err) return reject({error: err});

                  async.each(cgs, (cg, cb1) => {
                    this.getByGroupId(cg.id).then(data => {
                      childGroups.push(data);
                      cb1();
                    }, err => sails.log.error(err));
                  }, () => {
                    delete menu[group.id].childGroups;
                    menu[group.id].childGroups = null;
                    // sails.log.info(childGroups);
                    menu[group.id].children = childGroups;
                    loadDishes(cb);
                  });
                });
              } else
                loadDishes(cb);
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
      Dish.find(criteria).populate(['tags', 'images']).exec((err, dishes) => {
        if (err) reject(err);

        async.each(dishes, (dish, cb) => {
          async.eachOf(dish.modifiers, (modifier, key, cb) => {
            if (modifier.childModifiers && modifier.childModifiers.length > 0) {
              Group.findOne({id: modifier.modifierId}).exec((err, group) => {
                if (err) cb(err);
                dish.modifiers[key].group = group;

                async.eachOf(modifier.childModifiers, function (modifier, key1, cb) {
                  Dish.findOne({id: modifier.modifierId}).exec((err, modifier1) => {
                    if (err) cb(err);

                    dish.modifiers[key].childModifiers[key1].dish = modifier1;
                    return cb();
                  });
                }, function (err) {
                  return cb(err);
                });
              });
            } else {
              Dish.findOne({id: modifier.modifierId}).exec((err, modifier1) => {
                if (err) cb(err);

                dish.modifiers[key].dish = modifier1;
                return cb();
              });
            }
          }, function (err) {
            dish.images.reverse();

            return cb(err);
          });
        }, function (err) {
          if (err) reject(err);

          resolve(dishes);
        });
      });
    });
  },

  /**
   * create dish or update exists
   * @param values
   * @return {{exec: exec}}
   */
  createOrUpdate: function (values) {
    return {
      exec: function (cb) {
        Dish.findOne({id: values.id}).populate('tags').exec((err, dish) => {
          if (err) return cb(err);
          if (!dish) {
            Dish.create(values).populate('tags').exec((err, dish) => {
              if (err) return cb(err);
              return cb(null, dish);
            });
          } else {
            Dish.update({id: values.id}, values).exec(err => {
              if (err) return cb(err);
              Dish.findOne({id: values.id}).populate('tags').exec((err, dish) => {
                if (err) return cb(err);

                return cb(null, dish);
              });
            });
          }
        });
      }
    }
  }
};
