module.exports = {
  /**
   * Add dish in cart
   * @param params(cartId, dishesId)
   * @returns {Promise<>}
   */
  addDish: function (params) {
    return new Promise(async (resolve, reject) => {
      const cartId = params.cartId;
      const dishesId = params.dishesId;

      if (!cartId)
        return reject('cartId (string) is required as first element of params');

      if (!dishesId || !dishesId.length)
        return reject('dishIds (array of strings) is required as second element of params');

      try {
        const cart = await Cart.findOne(cartId);

        if (!cart) {
          return reject('cart with id ' + cartId + ' not found')
        }

        async.each(dishesId, async (dishId, cb) => {
          const dish = await Dish.findOneByCartId(dishId);

          cart.addDish(dish, params.amount, params.modifiers, params.comment, err => {
            if (err) return cb(err);

            return cb();
          }, 'delivery');
        }, (err) => {
          if (err) return reject(err);

          sails.log.info('resolve');
          return resolve(cart);
        });
      } catch (e) {
        return reject(e);
      }
    })
  },

  /**
   * Set delivery coast
   * @param params(cartId, deliveryCoast)
   * @returns {Promise<>}
   */
  delivery: function (params) {
    return new Promise(async (resolve, reject) => {
      const cartId = params.cartId;
      const deliveryCost = params.deliveryCost;
      const deliveryItem = params.deliveryItem;

      if (!cartId)
        return reject('cartId (string) is required as first element of params');

      if (!deliveryCost && !deliveryItem)
        return reject('one of deliveryCost or deliveryItem is required');

      if (deliveryCost && typeof deliveryCost !== 'number')
        return reject('deliveryCost (float) is required as second element of params');

      if (deliveryItem && typeof deliveryItem !== 'string')
        return reject('deliveryCost (string) is required as second element of params');

      try {
        const cart = await Cart.findOneByCartId(cartId);

        if (!cart) {
          return reject('cart with id ' + cartId + ' not found')
        }

        if (deliveryItem) {
          const item = await Dish.findOne({rmsId: deliveryItem});
          if (!item) {
            return reject('deliveryItem with rmsId ' + deliveryItem + ' not found');
          }
          cart.delivery = item.price;
          cart.deliveryItem = item.id;
        } else {
          cart.delivery = deliveryCost;
        }
        cart.deliveryStatus = 0;
        if (cart.state === 'CART')
          await cart.next();

        cart.save(err => {
          if (err) sails.log.error('err causes1', err);

          return resolve(cart);
        });
      } catch (e) {
        return reject(e);
      }
    });
  },

  /**
   * Reset all cart action
   * @param cartId
   * @returns {Promise<>}
   */
  reset: function (cartId) {
    return new Promise(async (resolve, reject) => {
      if (!cartId)
        return reject('cartId (string) is required as first element of params');

      try {
        const cart = await Cart.findOneByCartId(cartId);

        if (!cart) {
          return reject('cart with id ' + cartId + ' not found')
        }

        cart.delivery = 0;
        cart.deliveryStatus = null;
        cart.deliveryDescription = "";
        cart.message = "";

        cart.save(async err => {
          if (err) return sails.log.error('err causes2', err);

          const removeDishes = await CartDish.find({cart: cart.id, addedBy: 'delivery'});

          async.each(removeDishes, (dish, cb) => {
            cart.removeDish(dish.id, 100, cb);
          }, (err) => {
            if (err) return reject(err);

            return resolve(cart);

          });
        });
      } catch (e) {
        return reject(e);
      }
    });
  },

  setDeliveryDescription: function (params) {
    return new Promise(async (resolve, reject) => {
      const cartId = params.cartId;
      const description = params.description;

      if (!cartId)
        return reject('cartId (string) is required as first element of params');

      if (!description) {
        return reject('description (string) is required as second element of params')
      }

      try {
        const cart = await Cart.findOneByCartId(cartId);

        if (!cart) {
          return reject('cart with id ' + cartId + ' not found')
        }

        cart.deliveryDescription = cart.deliveryDescription || "";
        cart.deliveryDescription += description + '\n';

        cart.save(err => {
          if (err) sails.log.error('err causes3', err);

          return resolve(cart);
        });
      } catch (e) {
        return reject(e);
      }
    });
  },

  reject: function (params) {
    return new Promise(async (resolve, reject) => {
      const cartId = params.cartId;

      if (!cartId)
        return reject('cartId (string) is required as first element of params');

      try {
        const cart = await Cart.findOneByCartId(cartId);

        if (!cart) {
          return reject('cart with id ' + cartId + ' not found')
        }

        cart.deliveryStatus = null;

        cart.save(err => {
          if (err) sails.log.error('err causes4', err);

          return resolve(cart);
        });
      } catch (e) {
        return reject(e);
      }
    });
  },

  setMessage: function (params) {
    return new Promise(async (resolve, reject) => {
      const cartId = params.cartId;
      const message = params.message;

      if (!cartId) {
        return reject('cartId (string) is required as first element of params');
      }

      if (!message) {
        return reject('description (string) is required as second element of params')
      }

      try {
        const cart = await Cart.findOneByCartId(cartId);

        if (!cart) {
          return reject('cart with id ' + cartId + ' not found')
        }

        cart.message = message;

        cart.save(err => {
          if (err) sails.log.error('err causes4', err);

          return resolve(cart);
        });
      } catch (e) {
        return reject(e);
      }
    });
  },

  return: function () {
    return 0;
  }
};
