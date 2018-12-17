const email = require("emailjs");
const ejs = require("ejs");
const fs = require("fs");

sails.on('stateNext', async cart => {
  if (cart.state === 'COMPLETE') {
    try {
      const emails = (await SystemInfo.findOneByKey('email')).value;
      if (!emails) return sails.log.error('Email field in system info is required!');
      const checkProblem = (await SystemInfo.findOneByKey('checkProblem')).value;
      const orderProblem = (await SystemInfo.findOneByKey('orderProblem')).value;

      if (!sails.config.restocore.email)
        return sails.log.error('email in /config/restocore.js is required');
      if (!sails.config.restocore.email.server)
        return sails.log.error('server field in restocore.email is required');
      if (!sails.config.restocore.email.template)
        return sails.log.error('template field in restocore.email is required');
      const path = sails.config.restocore.email.template;

      const server = email.server.connect(sails.config.restocore.email.server);

      returnFullCart(cart).then(cart => {
        fs.readFile(process.cwd() + path, function (err, data) {
          if (err) return sails.log.error(err);

          cart.cp = checkProblem;
          cart.op = orderProblem;

          const html = ejs.render(data.toString(), cart);

          const message = {
            from: sails.config.restocore.email.server.user,
            to: emails,
            subject: 'Заказ №' + (cart.iikoId ? cart.iikoId : cart.id),
            attachment:
              {
                data: html,
                alternative: true
              },
          };

          server.send(message, function (err, message) {
            if (err) return sails.log.error(err);

            // return sails.log.debug(message);
          });
        });
      });
    } catch (err) {
      return sails.log.error(err);
    }
  }
});

module.exports.fail = async function (cart) {
  try {
    const emails = (await SystemInfo.findOneByKey('email')).value;
    if (!emails) return sails.log.error('Email field in system info is required!');
    const checkProblem = (await SystemInfo.findOneByKey('checkProblem')).value;
    const orderProblem = (await SystemInfo.findOneByKey('orderProblem')).value;

    if (!sails.config.restocore.email)
      return sails.log.error('email in /config/restocore.js is required');
    if (!sails.config.restocore.email.server)
      return sails.log.error('server field in restocore.email is required');
    if (!sails.config.restocore.email.template)
      return sails.log.error('template field in restocore.email is required');
    const path = sails.config.restocore.email.templateTry;

    const server = email.server.connect(sails.config.restocore.email.server);

    returnFullCart(cart).then(cart => {
      fs.readFile(process.cwd() + path, function (err, data) {
        if (err) return sails.log.error(err);

        cart.cp = checkProblem;
        cart.op = orderProblem;

        const html = ejs.render(data.toString(), cart);

        const message = {
          from: sails.config.restocore.email.server.user,
          to: emails,
          subject: "Попытка оформить заказ",
          attachment:
            {
              data: html,
              alternative: true
            },
        };

        server.send(message, function (err, message) {
          if (err) return sails.log.error(err);

          // return sails.log.debug(message);
        });
      });
    });
  } catch (err) {
    return sails.log.error(err);
  }
};

function returnFullCart(cart) {
  return new Promise((resolve, reject) => {
    Cart.findOne({id: cart.id}).populate('dishes').exec((err, cart) => {
      if (err) reject(err);
      cart.count(cart, () => {
        CartDish.find({cart: cart.id}).exec((err, dishes) => {
          if (err) reject(err);

          async.each(cart.dishes, (cartDish, cb) => {
            async.each(dishes, (dish, cb) => {
              Dish.findOne({id: dish.dish}).populate([/*'tags', */'images']).exec((err, origDish) => {
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

module.exports.returnFullCart = returnFullCart;
