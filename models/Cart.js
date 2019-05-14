// noinspection JSUnusedGlobalSymbols
/**
 * @api {API} Cart Cart
 * @apiGroup Models
 * @apiDescription Модель корзины. Имеет в себе список блюд, данные про них, методы для добавления/удаления блюд
 *
 * @apiParam {Integer} id Уникальный идентификатор
 * @apiParam {String} cartId ID корзины, по которой к ней обращается внешнее апи
 * @apiParam {[CartDish](#api-Models-ApiCartdish)[]} dishes Массив блюд в текущей корзине. Смотри [CartDish](#api-Models-ApiCartdish)
 * @apiParam {Integer} countDishes Общее количество блюд в корзине (с модификаторами)
 * @apiParam {Integer} uniqueDishes Количество уникальных блюд в корзине
 * @apiParam {Integer} cartTotal Полная стоимость корзины
 * @apiParam {Float} delivery Стоимость доставки
 * @apiParam {Boolean} problem Есть ли проблема с отправкой на IIKO
 * @apiParam {JSON} customer Данные о заказчике
 * @apiParam {JSON} address Данные о адресе доставки
 * @apiParam {String} comment Комментарий к заказу
 * @apiParam {Integer} personsCount Количество персон
 * @apiParam {Boolean} sendToIiko Был ли отправлен заказ IIKO
 * @apiParam {String} iikoId ID заказа, который пришёл от IIKO
 * @apiParam {String} deliveryStatus Статус состояния доставки (0 успешно расчитана)
 * @apiParam {Boolean} selfDelivery Признак самовывоза
 * @apiParam {String} deliveryDescription Строка дополнительной информации о доставке
 * @apiParam {String} message Сообщение, что отправляется с корзиной
 */

/*
 * @api {API}
 * @apiGroup
 * @apiDescription
 *
 * @apiParam {}
 * @apiParam {}
 * @apiParam {}
 * @apiParam {}
 * @apiParam {}
 */

const checkExpression = require('../lib/checkExpression');

module.exports = {
  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true
    },
    cartId: 'string',
    dishes: {
      collection: 'cartDish',
      via: 'cart'
    },
    dishesCount: 'integer',
    uniqueDishes: 'integer',
    cartTotal: 'float',
    modifiers: 'json',
    delivery: 'float',
    customer: 'json',
    address: 'json',
    comment: 'string',
    personsCount: 'integer',
    problem: {
      type: 'boolean',
      defaultsTo: false
    },
    sendToIiko: {
      type: 'boolean',
      defaultsTo: false
    },
    iikoId: 'string',
    deliveryStatus: 'string',
    selfDelivery: {
      type: 'boolean',
      defaultsTo: false
    },
    deliveryDescription: {
      type: 'string',
      defaultsTo: ""
    },
    message: 'string',
    deliveryItem: 'string',

    /**
     * @description Add dish in cart
     * @param dish - dish object
     * @param amount
     * @param modifiers - json
     * @param comment
     * @param cb
     * @param from
     * @returns function
     */
    addDish: function (dish, amount, modifiers, comment, cb, from) {
      if (typeof amount !== 'number')
        return cb({error: 'amount must be a number'});
      if (dish.balance !== -1)
        if (amount > dish.balance)
          return cb({error: 'There is no so mush dishes ' + dish.id, code: 1});

      Cart.findOne({id: this.id}).populate('dishes').exec((err, cart) => {
        if (err) return cb({error: err});

        const reason = checkExpression(dish);
        if (reason) {
          if (reason !== 'promo') {
            cart.next('CART').then(() => {
              return cb(null, cart);
            });
          }
        }

        // sails.log('1 ', new Date().getTime());
        async.each(modifiers, (m, cb) => {
          if (!m.amount)
            m.amount = 1;
          cb();
        }, () => {
          // sails.log('2 ', new Date().getTime());
          CartDish.create({
            dish: dish.id,
            cart: this.id,
            amount: parseInt(amount),
            modifiers: modifiers,
            comment: comment,
            addedBy: from
          }).exec((err) => {
            if (err) return cb({error: err});

            // sails.log.info(modifiers);

            // sails.log('25', new Date().getTime());
            cart.next('CART').then(() => {
              // sails.log('3 ', new Date().getTime());
              cb(null, cart);
            }, err => {
              cb(err);
            });
          });
        });
      });
    },

    /**
     * @description Remove dish from cart
     * @param dishId
     * @param amount
     * @param cb
     * @return function
     */
    removeDish: function (dishId, amount, cb) {
      if (typeof amount !== 'number')
        return cb({error: 'amount must be a number'});
      Cart.findOne({id: this.id}).populate('dishes').exec((err, cart) => {
        if (err) return cb({error: err});

        CartDish.findOne({cart: cart.id, id: dishId}).populate('dish').exec((err, cartDishes) => {
          if (err) return cb({error: err});
          if (!cartDishes) return cb({error: 404});

          const get = cartDishes;
          get.amount -= parseInt(amount);
          if (get.amount > 0) {
            CartDish.update({id: get.id}, {amount: get.amount}).exec((err) => {
              if (err) return cb({error: err});

              cart.next('CART').then(() => {
                cb(null, cart);
              }, err => {
                cb(err);
              });
            });
          } else {
            get.destroy();
            cart.next('CART').then(() => {
              count(cart, () => {
                cb(null, cart);
              });
            }, err => {
              cb(err);
            });
          }
        });
      });
    },

    count: count,

    /**
     * Set dish count
     * @param dish
     * @param amount
     * @param cb
     * @return {error, cart}
     */
    setCount: function (dish, amount, cb) {
      if (typeof amount !== 'number')
        return cb({error: 'amount must be a number'});
      if (dish.balance !== -1)
        if (amount > dish.balance)
          return cb({error: 'There is no so mush dishes ' + dish.id});

      Cart.findOne({id: this.id}).populate('dishes').exec((err, cart) => {
        if (err) return cb({error: err});

        CartDish.find({cart: cart.id}).populate('dish').exec((err, cartDishes) => {
          if (err) return cb({error: err});

          let get = null;
          async.each(cartDishes, (item, cb) => {
            if (item.dish.id === dish.id)
              get = item;
            cb();
          }, () => {
            if (get) {
              get.amount = parseInt(amount);
              if (get.amount > 0) {
                CartDish.update({id: get.id}, {amount: get.amount}).exec((err) => {
                  if (err) return cb({error: err});

                  cart.next('CART').then(() => {
                    count(cart, () => {
                      cb(null, cart);
                    });
                  }, err => {
                    cb(err);
                  });
                });
              } else {
                get.destroy();
                cart.next('CART').then(() => {
                  count(cart, () => {
                    cb(null, cart);
                  });
                }, err => {
                  cb(err);
                });
              }
            } else {
              return cb({error: 404});
            }
          });
        });
      });
    },

    /**
     * Set modifier count
     * @param dish
     * @param modifier
     * @param amount
     * @param cb
     * @return {*}
     */
    setModifierCount: function (dish, modifier, amount, cb) {
      if (modifier.balance !== -1)
        if (amount > modifier.balance)
          return cb({error: 'There is no so mush dishes ' + modifier.id});

      CartDish.find({cart: this.id}).populate(['dish', 'modifiers']).exec((err, cartDishes) => {
        if (err) return cb({error: err});

        let get = null;
        cartDishes.forEach(item => {
          if (item.dish.id === dishId)
            get = item;
        });

        Dish.findOne({id: dishId})/*.populate('modifiers')*/.exec((err, dish) => {
          if (err) return cb({error: err});

          // check that dish has this modifier
          let get1 = null;
          dish.modifiers.forEach(item => {
            if (item.id === modifier.id)
              get1 = item;
          });

          if (get1) {
            // modifier
            let get2 = null;
            get.modifiers.forEach(item => {
              if (modifier.id === item.dish)
                get2 = item;
            });

            if (get2) {
              get2.amount = parseInt(amount);

              CartDish.update({id: get2.id}, {amount: get2.amount}).exec((err) => {
                if (err) return cb({error: err});

                countDish(get, function () {
                  return cb(null, this);
                });
              });
            } else {
              return cb({error: 404});
            }
          } else {
            return cb({error: 404});
          }
        });
      });
    },

    setComment: function (dish, comment, cb) {
      Cart.findOne({id: this.id}).populate('dishes').exec((err, cart) => {
        if (err) return cb({error: err});

        CartDish.find({cart: cart.id}).populate('dish').exec((err, cartDishes) => {
          if (err) return cb({error: err});

          let get = null;
          async.each(cartDishes, (item, cb) => {
            if (item.dish.id === dish.id)
              get = item;
            cb();
          }, () => {
            if (get) {
              CartDish.update({id: get.id}, {comment: comment}).exec((err) => {
                if (err) return cb({error: err});

                cart.next('CART').then(() => {
                  count(cart, () => {
                    cb(null, cart);
                  });
                }, err => {
                  cb(err);
                });
              });
            } else {
              return cb({error: 404});
            }
          });
        });
      });
    },
  },

  beforeCreate: count,

  returnFullCart: function (cart) {
    return new Promise((resolve, reject) => {
      Cart.findOne({id: cart.id}).populate('dishes').exec((err, cart) => {
        if (err) return reject(err);

        CartDish.find({cart: cart.id}).populate('dish').exec((err, dishes) => {
          if (err) return reject(err);

          async.each(cart.dishes, (cartDish, cb) => {
            let deleted = false;
            async.eachSeries(dishes, (dish, cb) => {
              if (!deleted) {
                Dish.findOne({
                  id: dish.dish.id,
                  isDeleted: false
                }).populate(['images', 'parentGroup']).exec((err, origDish) => {
                  if (err) return cb(err);

                  if (origDish && origDish.parentGroup && !checkExpression(origDish.parentGroup)) {
                    if (cartDish.id === dish.id) {
                      cartDish.dish = origDish;
                      async.eachOf(origDish.modifiers, (modifier, key, cb) => {
                        if (modifier.childModifiers && modifier.childModifiers.length > 0) {
                          Group.findOne({id: modifier.modifierId}).exec((err, group) => {
                            if (err) cb(err);
                            origDish.modifiers[key].group = group;

                            async.eachOf(modifier.childModifiers, function (modifier, key1, cb) {
                              Dish.findOne({id: modifier.modifierId}).exec((err, modifier1) => {
                                if (err) cb(err);

                                origDish.modifiers[key].childModifiers[key1].dish = modifier1;
                                return cb();
                              });
                            }, function (err) {
                              cartDish.dish = origDish;
                              return cb(err);
                            });
                          });
                        } else {
                          Dish.findOne({id: modifier.id}).exec((err, modifier1) => {
                            if (err) cb(err);

                            origDish.modifiers[key].dish = modifier1;
                            return cb();
                          });
                        }
                      }, function (err) {
                        cartDish.modifiers = dish.modifiers;
                        return cb(err);
                      });
                    } else {
                      return cb();
                    }
                  } else {
                    sails.log.info('destroy', dish.id);
                    CartDish.destroy(dish).exec((err) => {
                      cart.dishes.remove(cartDish.id);
                      delete cart.dishes[cart.dishes.indexOf(cartDish)];
                      deleted = true;
                      cart.save(err1 => {
                        return cb(err || err1);
                      });
                    });
                  }
                });
              } else {
                cb();
              }
            }, function (err) {
              if (err) return cb(err);
              if (!deleted) {
                if (Array.isArray(cartDish.modifiers)) {
                  async.each(cartDish.modifiers, (modifier, cb) => {
                    Dish.findOne({id: modifier.id}).exec((err, dish) => {
                      if (err) return cb(err);

                      modifier.dish = dish;
                      cb();
                    });
                  }, function (err) {
                    cb(err);
                  });
                } else {
                  if (cartDish.modifiers) {
                    Dish.findOne({id: cartDish.modifiers.id}).exec((err, dish) => {
                      if (err) return cb(err);

                      cartDish.modifiers.dish = dish;
                      cb();
                    });
                  } else {
                    cb();
                  }
                }
              } else {
                cb();
              }
            });
          }, function (err) {
            if (err) return reject(err);

            cart.count(cart, () => {
              return resolve(cart);
            });
          });
        });
      });
    });
  }
};

/**
 * Calculate count of dishes and modifiers in cart
 * @param values
 * @param next
 */
function count(values, next) {
  CartDish.find({cart: values.id}).populate('dish').exec((err, dishes) => {
    if (err) {
      sails.log.error('err count1', err);
      return next();
    }

    let cartTotal = 0;
    let dishesCount = 0;
    let uniqueDishes = 0;

    // sails.log.info(dishes);

    async.each(dishes, (dish, cb) => {
      if (dish.dish) {
        Dish.findOne({id: dish.dish.id}).exec((err, dish1) => {
          if (err) {
            sails.log.error('err count2', err);
            return cb(err);
          }

          if (!dish1) {
            sails.log.error('Dish with id ' + dish.dish.id + ' not found!');
            return cb(err);
          }

          countDish(dish, dish => {
            if (dish.itemTotal)
              cartTotal += dish.itemTotal;
            cartTotal += dish.amount * dish1.price;
            dishesCount += dish.amount;
            uniqueDishes++;
            cb();
          });

        });
      } else {
        cb();
      }
    }, err => {
      if (err)
        return next();
      values.cartTotal = cartTotal;
      values.dishesCount = dishesCount;
      values.uniqueDishes = uniqueDishes;

      next();
    });
  });
}

function countDish(dishOrig, next) {
  CartDish.findOne({id: dishOrig.id}).exec((err, dish) => {
    if (err) {
      sails.log.error('err count3', (err));
      return next();
    }

    if (!dish) {
      next();
    }

    const modifs = dish.modifiers;

    dish.uniqueItems = 0;
    dish.itemTotal = 0;

    async.each(modifs, (m, cb) => {
      dish.uniqueItems += m.amount;
      Dish.findOne({id: m.id}).exec((err, m1) => {
        if (err) {
          sails.log.error('err count4', err);
          return next();
        }

        if (!m1) {
          sails.log.error('Dish with id ' + m.id + ' not found!');
          return next();
        }

        dish.itemTotal += m.amount * m1.price * dish.amount;
        cb();
      });
    }, () => {
      dish.itemTotal += dishOrig.price;
      dish.save(err => {
        if (err) sails.log.error('err count5', err);
        next(dish);
      });
    });
  });
}
