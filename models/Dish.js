/**
 * @api {API} Dish Dish
 * @apiGroup Models
 * @apiDescription Модель блюда
 *
 * @apiParam {String} id Уникальный идентификатор
 * @apiParam {String} additionalInfo Дополнительная информация
 * @apiParam {String} code Артикул
 * @apiParam {String} description Описание
 * @apiParam {String} name Название
 * @apiParam {String} seoDescription SEO-описание для клиента
 * @apiParam {String} seoKeywords SEO-ключевые слова
 * @apiParam {String} seoText SEO-текст для роботов
 * @apiParam {String} seoTitle SEO-заголовок
 * @apiParam {Float} carbohydrateAmount Количество углеводов на 100 г блюда
 * @apiParam {Float} carbohydrateFullAmount Количество углеводов в блюде
 * @apiParam {Array} differentPricesOn Список терминалов, на которых цена продукта отличается от стандартной и цен на них
 * @apiParam {Boolean} doNotPrintInCheque Блюдо не нужно печатать на чеке. Актуально только для модификаторов
 * @apiParam {Float} energyAmount Энергетическая ценность на 100 г блюда
 * @apiParam {Float} energyFullAmount Энергетическая ценность в блюде
 * @apiParam {Float} fatAmount Количество жиров на 100 г блюда
 * @apiParam {Float} fatFullAmount Количество жиров в блюде
 * @apiParam {Float} fiberAmount Количество белков на 100 г блюда
 * @apiParam {Float} fiberFullAmount Количество белков в блюде
 * @apiParam {String} groupId Идентификатор группы
 * @apiParam {Array} groupModifiers Групповые модификаторы (не используется в пользу modifiers)
 * @apiParam {String} measureUnit Единица измерения товара ( кг, л, шт, порц.)
 * @apiParam {Float} price Цена
 * @apiParam {Group} productCategoryId Идентификатор категории продукта
 * @apiParam {Array} prohibitedToSaleOn Список ID терминалов, на которых продукт запрещен к продаже
 * @apiParam {String} type Тип:
 dish - блюдо
 good - товар
 modifier - модификатор
 * @apiParam {Boolean} useBalanceForSell Товар продается на вес
 * @apiParam {Float} weight Вес одной единицы в кг
 * @apiParam {Boolean} isIncludedInMenu Нужно ли продукт отображать в дереве номенклатуры
 * @apiParam {Float} order Порядок отображения
 * @apiParam {Boolean} isDeleted Удалён ли продукт в меню, отдаваемого клиенту
 * @apiParam {JSON} modifiers Модификаторы доступные для данного блюда
 * @apiParam {Group} parentGroup Группа, к которой принадлежит блюдо
 * @apiParam {Tags[]} tags Тэги
 * @apiParam {Integer} balance Количество оставшихся блюд. -1 - бесконечно
 * @apiParam {Image[]} images Картинки блюда
 * @apiParam {Integer} itemTotal
 * @apiParam {String} slug Текстовое название блюда в транслите
 *
 */

const checkExpression = require('../lib/checkExpression');

module.exports = {

  attributes: {
    id: {
      type: 'string',
      required: true,
      primaryKey: true
    },
    additionalInfo: 'string',
    code: 'string',
    description: 'string',
    name: 'string',
    seoDescription: 'string',
    seoKeywords: 'string',
    seoText: 'string',
    seoTitle: 'string',
    carbohydrateAmount: 'float',
    carbohydrateFullAmount: 'float',
    differentPricesOn: 'array',
    doNotPrintInCheque: 'boolean',
    energyAmount: 'float',
    energyFullAmount: 'float',
    fatAmount: 'float',
    fatFullAmount: 'float',
    fiberAmount: 'float',
    fiberFullAmount: 'float',
    groupId: 'string',
    groupModifiers: 'array',
    measureUnit: 'string',
    price: 'float',
    productCategoryId: 'string',
    prohibitedToSaleOn: 'array',
    type: 'string',
    useBalanceForSell: 'boolean',
    weight: 'float',
    isIncludedInMenu: 'boolean',
    order: 'float',
    isDeleted: 'boolean',
    modifiers: {
      // collection: 'dish'
      type: 'json'
    },
    parentGroup: {
      model: 'group'
    },
    tags: {
      type: 'json'
      // collection: 'tags',
      // via: 'dishes',
      // dominant: true
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
    },
    hash: 'string'

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
        });
      } else {
        if (groupsId) {
          Group.findOne({id: groupsId}).populate(['images', 'dishes', 'childGroups'/*, 'dishesTags'*/]).exec((err, group) => {
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
                if (group.children.length > 1)
                  group.children.sort((a, b) => a.order - b.order);
                loadDishes(cb);
              });
            } else
              loadDishes(cb);
          });
        } else {
          let menu = {};
          Group.find({parentGroup: null}).populate(['childGroups', 'dishes', /*'dishesTags',*/ 'images']).exec((err, groups) => {
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
                Group.find({id: group.childGroups.map(cg => cg.id)}).populate(['childGroups', 'dishes', /*'dishesTags',*/ 'images']).exec((err, cgs) => {
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
                    if (menu[group.id].children.length > 1)
                      menu[group.id].children.sort((a, b) => a.order - b.order);
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
      Dish.find(criteria).populate([/*'tags',*/ 'images']).exec((err, dishes) => {
        if (err) reject(err);

        async.each(dishes, (dish, cb) => {
          if (checkExpression(dish)) {
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
              // dish.images.reverse();
              try {
                if (dish.images.length >= 2)
                  dish.images.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
              } catch (e) {
                sails.log.error('err32', e, dish.images);
              }

              return cb(err);
            });
          } else {
            cb();
          }
        }, function (err) {
          if (err) reject(err);

          dishes.sort((a, b) => a.order - b.order);
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
        Dish.findOne({id: values.id})/*.populate('tags')*/.exec((err, dish) => {
          if (err) return cb(err);

          if (!dish) {
            Dish.create(values)/*.populate('tags')*/.exec((err, dish) => {
              if (err) return cb(err);
              return cb(null, dish);
            });
          } else {
            if (JSON.stringify(values) === dish.hash) {
              cb(null, dish);
            } else {
              Dish.update({id: values.id}, values).exec((err, dish) => {
                if (err) return cb(err);
                return cb(null, dish[0]);
              });
            }
          }
        });
      }
    }
  }
};
