module.exports = {
  addDish: function (params) {
    return new Promise(async (resolve, reject) => {
      const cartId = params.cartId;
      const dishIds = params.dishIds;

      if (!cartId)
        return reject('cartId (string) is required as first element of params');

      if (!dishIds || !dishIds.length)
        return reject('dishIds (array of strings) is required as second element of params');

      try {
        const cart = await Cart.findOne(cartId);

        const removeDishes = await CartDish.find({cart: cartId, addedBy: 'delivery'});

        async.each(removeDishes, (dish, cb) => {
          cart.removeDish(dish.id, 100, cb);
        }, () => {
          async.each(dishIds, async (dishId, cb) => {
            const dish = await Dish.findOne(dishId);

            cart.addDish(dish, params.amount, params.modifiers, params.comment, err => {
              if (err) return cb(err);

              return cb();
            }, 'delivery');
          });
        }, (err) => {
          if (err) return reject(err);

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

        cart.delivery = deliveryCoast;

        cart.save();
        return resolve(cart);
      } catch (e) {
        return reject(e);
      }
    });
  }
};
