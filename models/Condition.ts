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

import Cart from "../models/Cart";
import Cause from "../modelsHelp/Cause";
import causes from "../lib/causes";
import actions from "../lib/actions";
import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import {ActionParams} from "../modelsHelp/Actions";
//import Zone from "@webresto/native-check/models/Zone"; // TODO: move to native-check

module.exports = {
  attributes: {
    name: 'string',
    slug: {
      type: 'slug',
      from: 'name'
    },
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
    // zones: {
    //   collection: 'zone'
    // },
    needy: {
      type: 'boolean',
      defaultsTo: false
    },

    /**
     * Проверяет что заданная корзина проходит условия causes текущего Condition
     * @param cart
     */
    check: async function (cart: Cart): Promise<boolean> {
      return await causes(this, cart);
    },

    /**
     * Выполняет все actions текущего условия для заданной корзины
     * @param cart
     */
    exec: async function (cart: Cart): Promise<Cart> {
      let result = cart;
      await Promise.each(Object.entries(this.actions as { [action: string]: ActionParams }), async ([action, params]) => {
        if (typeof params === 'boolean') {
          params = {} as ActionParams;
        }
        params.cartId = cart.id;
        result = await Condition.action(action, params);
      });
      return result;
    },

    /**
     * @return Возвращает true, если в actions указано return: true или reject: true
     */
    hasReturn: function (): boolean {
      return this.actions.return || this.actions.reject;
    }
  },

  /**
   * Выполняет действие actionName с параметрами params и возвращает результат его выполнения -- новую корзину
   * @param actionName - название action
   * @param params - параметры
   */
  action: async function (actionName: string, params: ActionParams): Promise<Cart> {
    const action = actions[actionName];
    if (!action) {
      throw 'action not found'
    }

    return await action(params);
  },

  /**
   * @return возвращает наличие условий в проекте. Если условий нет, то false
   */
  async checkConditionsExists(): Promise<boolean> {
    let conditions = await Condition.find();
    return conditions.length > 0;
  },

  /**
   * Возвращает все условия, которые привязаны в зоне, в которую входят заданные улица-дом
   * @param street - улица
   * @param home - дом
   * @return массив условий, которые следует проверять для заданных улицы и дома
   */
  async getConditions(street: string, home: number): Promise<Condition[]> {
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
      }
    }

    conditions = conditions.filter(c => !c.zones || c.zones.filter(z => z.id === zone.id).length);
    conditions = conditions.concat(needy);
    conditions.sort((a, b) => b.weight - a.weight);

    return conditions;
  }
};

/**
 * Описывает одно условие с его условиями и действиями для выполнения
 */
export default interface Condition extends ORM {
  name: string;
  description: string;
  enable: boolean;
  weight: number;
  causes: Cause;
  actions: any;
  //zones: Zone[];
  needy: boolean;

  /**
   * Проверяет что заданная корзина проходит условия causes текущего Condition
   * @param cart
   */
  check(cart: Cart): Promise<boolean>;

  /**
   * Выполняет все actions текущего условия для заданной корзины
   * @param cart
   */
  exec(cart: Cart): Promise<Cart>;

  /**
   * @return Возвращает true, если в actions указано return: true или reject: true
   */
  hasReturn(): boolean;
}

/**
 * Описывает класс Condition, используется для ORM
 */
export interface ConditionModel extends ORMModel<Condition> {
  /**
   * Выполняет действие actionName с параметрами params и возвращает результат его выполнения -- новую корзину
   * @param actionName - название action
   * @param params - параметры
   */
  action(actionName: string, params: ActionParams): Promise<any>;

  /**
   * @return возвращает наличие условий в проекте. Если условий нет, то false
   */
  checkConditionsExists(cart: Cart): Promise<boolean>;

  /**
   * Возвращает все условия, которые привязаны в зоне, в которую входят заданные улица-дом
   * @param street - улица
   * @param home - дом
   * @return массив условий, которые следует проверять для заданных улицы и дома
   */
  getConditions(street: string, home: number): Promise<Condition[]>
}

declare global {
  const Condition: ConditionModel;
}
