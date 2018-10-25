const email = require("emailjs");
const ejs = require("ejs");
const fs = require("fs");

sails.on('stateNext', cart => {
  if (cart.state === 'COMPLETE') {
    SystemInfo.find().exec((err, si) => {
      if (err) return sails.log.error(err);
      si = si[0];
      if (!si) return sails.log.error('There is no system info!');
      if (!si.email) return sails.log.error('Email field in system info is required!');

      if (!sails.config.restocore.email)
        return sails.log.error('email.js in /config is required');
      if (!sails.config.restocore.email.server)
        return sails.log.error('server field in restocore.email is required');
      if (!sails.config.restocore.email.template)
        return sails.log.error('template field in restocore.email is required');
      const path = sails.config.restocore.email.template;

      const server = email.server.connect(sails.config.email.server);

      returnFullCart(cart).then(cart => {
        fs.readFile(process.cwd() + path, function (err, data) {
          if (err) return sails.log.error(err);

          cart.cp = si.checkProblem;
          cart.op = si.orderProblem;
          const html = ejs.render(data.toString(), cart);

          const message = {
            from: sails.config.email.server.user,
            to: si.email,
            subject: 'Заказ №' + (cart.iikoId ? cart.iikoId : cart.id),
            attachment:
              {
                data: html,
                alternative: true
              },
          };

          server.send(message, function (err, message) {
            if (err) return sails.log.error(err);

            return sails.log.debug(message);
          });
        });
      });
    });
  }
});


function returnFullCart(cart) {
  return new Promise((resolve, reject) => {
    Cart.findOne({id: cart.id}).populate('dishes').exec((err, cart) => {
      if (err) reject(err);
      cart.count(cart, () => {
        CartDish.find({cart: cart.id}).exec((err, dishes) => {
          if (err) reject(err);

          async.each(cart.dishes, (cartDish, cb) => {
            async.each(dishes, (dish, cb) => {
              Dish.findOne({id: dish.dish}).populate(['tags', 'images']).exec((err, origDish) => {
                if (err) return cb(err);

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
              });
            }, function (err) {
              if (err) return cb(err);
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
            });
          }, function (err) {
            if (err) reject(err);
            resolve(cart);
          });
        });
      });
    });
  });
}
