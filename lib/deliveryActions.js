module.exports = {
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

  setDeliveryCoast: function (params) {
    return new Promise(async (resolve, reject) => {
      const cartId = params.cartId;
      const deliveryCoast = params.deliveryCoast;

      if (!cartId)
        return reject('cartId (string) is required as first element of params');

      if (!deliveryCoast)
        return reject('deliveryCoast (float) is required as second element of params');

      try {
        const cart = await Cart.findOne(cartId);

        if (!cart) {
          return reject('cart with id ' + cartId + ' not found')
        }

        cart.delivery = deliveryCoast;

        cart.save();
        return resolve(cart);
      } catch (e) {
        return reject(e);
      }
    });
  },

  reset: function (cartId) {
    return new Promise(async (resolve, reject) => {
      if (!cartId)
        return reject('cartId (string) is required as first element of params');

      try {
        const cart = await Cart.findOne(cartId);

        if (!cart) {
          return reject('cart with id ' + cartId + ' not found')
        }

        cart.delivery = 0;

        cart.save();

        const removeDishes = await CartDish.find({cart: cart.id, addedBy: 'delivery'});

        async.each(removeDishes, (dish, cb) => {
          cart.removeDish(dish.id, 100, cb);
        }, (err) => {
          if (err) return reject(err);

          return resolve(cart);

        });
      } catch (e) {
        return reject(e);
      }
    });
  }
};
