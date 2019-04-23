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
      return await causes(this, cart);
    },

    exec: function (cart) {
      const that = this;
      return new Promise((resolve, reject) => {
        async.eachOf(that.actions, async (params, action, cb) => {
          try {
            if (typeof params === 'boolean') {
              params = {};
            }
            params.cartId = cart.cartId;
            // sails.log.info(action, params);
            await Condition.action(action, params);
            return cb();
          } catch (e) {
            cb(e);
          }
        }, err => {
          if (err) return reject(err);
          resolve();
        })
      });
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
