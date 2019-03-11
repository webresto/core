/**
 * @api {API} Condition Condition
 * @apiGroup Models
 * @apiDescription Модель условия
 *
 * @apiParam {String} name Название условия-действия
 * @apiParam {String} description Описание условия
 * @apiParam {Boolean} enable Включено ли данное условие
 * @apiParam {Integer} weight Вес условия, чем больше, тем приоритетнее
 * @apiParam {JSON} causes Объект условий, которым необходимо выполниться
 * @apiParam {JSON} actions Объект действий, которые выполняются при выполнении всех условий
 */

const deliveryActions = require('../lib/deliveryActions');

module.exports = {
  attributes: {
    name: 'string',
    description: 'string',
    enable: {
      type: 'boolean',
      defaultsTo: true
    },
    weight: {
      type: 'integer',
      defaultsTo: 0
    },
    causes: 'json',
    actions: 'json',
    zones: {
      collection: 'zone'
    },

    check: function (cart) {
      return new Promise(async (resolve, reject) => {
        if (!this.enable)
          resolve(false);

        if (!this.causes)
          resolve(true);

        if (!checkTime(this.causes.workTime))
          resolve(false);

        cart.count(cart, err => {
          if (err) return reject(err);

          if (this.causes.cartAmount)
            resolve(between(this.causes.cartAmount.valueFrom, this.causes.cartAmount.valueTo, cart.cartTotal));

          resolve(true);
        });
      });
    },

    exec: function (cart) {
      const that = this;
      return new Promise((resolve, reject) => {
        async.eachOf(that.actions, async (params, action, cb) => {
          try {
            params.cartId = cart.id;
            sails.log.info(action, params);
            await Condition.action(action, params);
            sails.log.info('after action');
            return cb();
          } catch (e) {
            cb(e);
          }
        }, err => {
          if (err) return reject(err);
          sails.log.info('return exec');
          resolve();
        })
      });
    }
  },

  action: function (actionName, params) {
    return new Promise(async (resolve, reject) => {
      const action = deliveryActions[actionName];
      if (!action) {
        return reject('action not found')
      }

      resolve(await action(params));
    });
  }
};

function checkTime(timeArray) {
  if (!timeArray || !timeArray.length)
    return true;

  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function checkHours(start, stop) {
    const date = new Date();
    return between(start, stop, date.getHours());
  }

  try {
    const all = timeArray.filter(t => t.dayOfWeek === 'all')[0];
    if (all) {
      return checkHours(all.start, all.stop)
    }

    const today = weekday[date.getDay()];
    const day = timeArray.filter(t => t.dayOfWeek.toLowerCase() === today)[0];

    if (day) {
      return checkHours(day.start, day.stop);
    }

    return timeArray.length === 0;
  } catch (e) {
    sails.log.error(e);
    return false;
  }
}

function between(from, to, a) {
  return ((!from && !to) || (!from && to > a) || (!to && from < a) || (from < a && to > a));
}
