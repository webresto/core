"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const causes_1 = require("../../../@webresto/core/lib/causes");
const actions_1 = require("../../../@webresto/core/lib/actions");
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
        needy: {
            type: 'boolean',
            defaultsTo: false
        },
        /**
         * Проверяет что заданная корзина проходит условия causes текущего Condition
         * @param cart
         */
        check: async function (cart) {
            return await causes_1.default(this, cart);
        },
        /**
         * Выполняет все actions текущего условия для заданной корзины
         * @param cart
         */
        exec: async function (cart) {
            let result = cart;
            await Promise.each(Object.entries(this.actions), async ([action, params]) => {
                if (typeof params === 'boolean') {
                    params = {};
                }
                params.cartId = cart.id;
                result = await Condition.action(action, params);
            });
            return result;
        },
        /**
         * @return Возвращает true, если в actions указано return: true или reject: true
         */
        hasReturn: function () {
            return this.actions.return || this.actions.reject;
        }
    },
    /**
     * Выполняет действие actionName с параметрами params и возвращает результат его выполнения -- новую корзину
     * @param actionName - название action
     * @param params - параметры
     */
    action: async function (actionName, params) {
        const action = actions_1.default[actionName];
        if (!action) {
            throw 'action not found';
        }
        return await action(params);
    },
    /**
     * @return возвращает наличие условий в проекте. Если условий нет, то false
     */
    async checkConditionsExists() {
        let conditions = await Condition.find();
        return conditions.length > 0;
    },
    /**
     * Возвращает все условия, которые привязаны в зоне, в которую входят заданные улица-дом
     * @param street - улица
     * @param home - дом
     * @return массив условий, которые следует проверять для заданных улицы и дома
     */
    async getConditions(street, home) {
        let conditions = await Condition.find().populate('zones');
        const needy = conditions.filter(c => c.needy);
        const zones = await Zone.count();
        if (!zones) {
            return needy;
        }
        const zone = await Zone.getDeliveryCoast(street, home);
        if (!zone) {
            throw {
                code: 404,
                message: "zone not found"
            };
        }
        conditions = conditions.filter(c => !c.zones || c.zones.filter(z => z.id === zone.id).length);
        conditions = conditions.concat(needy);
        conditions.sort((a, b) => b.weight - a.weight);
        return conditions;
    }
};
