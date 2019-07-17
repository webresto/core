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
 * @apiParamExample causes
 * {
 *   workTime: [
 *    {
 *     dayOfWeek: 'monday',
 *     start: '8:00',
 *     end: '18:00'
 *    },
 *   ],
 *  cartAmount: {
 *    valueFrom: 100,
 *    valueTo: 1000
 *  },
 *  dishes: ['some dish id', 'other dish id', ...],
 *  groups: ['some group id', 'other groups id', ...]
 * }
 * @apiParam {JSON} actions Объект действий, которые выполняются при выполнении всех условий
 * @apiParamExample actions
 * {
 *   addDish: {
 *     dishesId: ['dish id', ...]
 *   },
 *   delivery: {
 *     deliveryCost: 100.00,
 *     deliveryItem: 'string'
 *   },
 *   setDeliveryDescription: {
 *     description: 'some string'
 *   },
 *   reject: true, (отказ доставки)
 *   setMessage: {
 *     message: 'string'
 *   },
 *   return: true (условия, вес которых ниже даного, игнорируются)
 * }
 * @apiParam {[Zone](#api-Models-ApiZone)} zones Зоны, к которым применяется данное условие
 */

const actions = require('../lib/actions');
const causes = require('../lib/causes');

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

    check: async function (cart) {
      return await causes(cart);
    },

    exec: function (cart) {
      const that = this;
      return new Promise((resolve, reject) => {
        let cartRes;
        async.eachOfSeries(that.actions, async (params, action, cb) => {
          try {
            if (typeof params === 'boolean') {
              params = {};
            }
            params.cartId = cart.cartId;
            // sails.log.info(action, params);
            cartRes = await Condition.action(action, params);
            return cb();
          } catch (e) {
            cb(e);
          }
        }, err => {
          if (err) return reject(err);
          resolve(cartRes);
        })
      });
    },

    hasReturn: function () {
      return this.actions.return || this.actions.reject;
    }
  },

  action: async function (actionName, params) {
    const action = actions[actionName];
    if (!action) {
      throw 'action not found'
    }

    return await action(params);
  }
};
