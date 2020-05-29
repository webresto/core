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
import Cart from "@webresto/core/models/Cart";
import Cause from "@webresto/core/modelsHelp/Cause";
import ORMModel from "@webresto/core/modelsHelp/ORMModel";
import ORM from "@webresto/core/modelsHelp/ORM";
import { ActionParams } from "@webresto/core/modelsHelp/Actions";
import Zone from "@webresto/native-check/models/Zone";
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
    zones: Zone[];
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
    getConditions(street: string, home: number): Promise<Condition[]>;
}
declare global {
    const Condition: ConditionModel;
}
