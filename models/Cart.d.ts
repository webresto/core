/**
 * @api {API} Cart Cart
 * @apiGroup Models
 * @apiDescription Модель корзины. Имеет в себе список блюд, данные про них, методы для добавления/удаления блюд
 *
 * @apiParam {Integer} id Уникальный идентификатор
 * @apiParam {String} cartId ID корзины, по которой к ней обращается внешнее апи
 * @apiParam {[CartDish](#api-Models-ApiCartdish)[]} dishes Массив блюд в текущей корзине. Смотри [CartDish](#api-Models-ApiCartdish)
 * @apiParam {Integer} countDishes Общее количество блюд в корзине (с модификаторами)
 * @apiParam {Integer} uniqueDishes Количество уникальных блюд в корзине
 * @apiParam {Integer} cartTotal Стоимость корзины без доставки
 * @apiParam {Integer} total Стоимость корзины с доставкой
 * @apiParam {Float} delivery Стоимость доставки
 * @apiParam {Boolean} problem Есть ли проблема с отправкой на IIKO
 * @apiParam {JSON} customer Данные о заказчике
 * @apiParam {JSON} address Данные о адресе доставки
 * @apiParam {String} comment Комментарий к заказу
 * @apiParam {Integer} personsCount Количество персон
 * @apiParam {Boolean} sendToIiko Был ли отправлен заказ IIKO
 * @apiParam {String} rmsId ID заказа, который пришёл от IIKO
 * @apiParam {String} deliveryStatus Статус состояния доставки (0 успешно расчитана)
 * @apiParam {Boolean} selfDelivery Признак самовывоза
 * @apiParam {String} deliveryDescription Строка дополнительной информации о доставке
 * @apiParam {String} message Сообщение, что отправляется с корзиной
 */
/**
 * arguments - arguments of function that call emitter
 *
 * addDish:
 * 1. ['core-cart-before-add-dish', ...arguments]
 * 2. ['core-cart-add-dish-before-create-cartdish', ...arguments]
 * 3. ['core-cart-after-add-dish', cartDish, ...arguments]
 * errors:
 * - ['core-cart-add-dish-reject-amount', ...arguments]
 *
 * removeDish:
 * 1. ['core-cart-before-remove-dish', ...arguments]
 * 2. ['core-cart-after-remove-dish', ...arguments]
 * errors:
 * - ['core-cart-remove-dish-reject-no-cartdish', ...arguments]
 *
 * setCount:
 * 1. ['core-cart-before-set-count', ...arguments]
 * 2. ['core-cart-after-set-count', ...arguments]
 * errors:
 * - ['core-cart-set-count-reject-amount', ...arguments]
 * - ['core-cart-set-count-reject-no-cartdish', ...arguments]
 *
 * setModifierCount:
 * 1. ['core-cart-before-set-modifier-count', ...arguments]
 * 2. ['core-cart-after-set-modifier-count', ...arguments]
 * errors:
 * - ['core-cart-set-modifier-count-reject-amount', ...arguments]
 * - ['core-cart-set-modifier-count-reject-no-cartdish', ...arguments]
 * - ['core-cart-set-modifier-count-reject-no-modifier-dish', ...arguments]
 * - ['core-cart-set-modifier-count-reject-no-modifier-in-dish', ...arguments]
 *
 * setComment:
 * 1. ['core-cart-before-set-comment', ...arguments]
 * 2. ['core-cart-after-set-comment', ...arguments]
 * errors:
 * - ['core-cart-set-comment-reject-no-cartdish', ...arguments]
 *
 * beforeCreate:
 * 1. 'core-cart-before-create', values
 *
 * returnFullCart:
 * 1. 'core-cart-before-return-full-cart', cart
 * 2. 'core-cart-return-full-cart-destroy-cartdish', dish, cart
 * 3. 'core-cart-after-return-full-cart', cart
 *
 * count:
 * 1. 'core-cart-before-count', cart
 * 2. 'core-cart-after-count', cart
 * errors:
 * - 'core-cart-count-reject-no-dish', cartDish, cart
 * - 'core-cart-count-reject-no-modifier-dish', modifier, cart
 *
 * check:
 * 1. 'core-cart-before-check', self, customer, isSelfService, address
 * 2. 'core-cart-check', self, customer, isSelfService, address
 * 3. 'core-cart-after-check', self, customer, isSelfService, address
 */
import Modifier from "@webresto/core/modelsHelp/Modifier";
import Address from "@webresto/core/modelsHelp/Address";
import Customer from "@webresto/core/modelsHelp/Customer";
import CartDish from "@webresto/core/models/CartDish";
import StateFlow from "@webresto/core/modelsHelp/StateFlow";
import ORMModel from "@webresto/core/modelsHelp/ORMModel";
import ORM from "@webresto/core/modelsHelp/ORM";
import Dish from "@webresto/core/models/Dish";
/**
 * Описывает модель корзины. Содержит в себе блюда и данных о них, данные о заказчике и месте доставки.
 * Имеет состояние state, которое указывает в каком моменте жизненного цикла сейчас находится корзина.
 * Схематически цикл переходов выглядить так
 * -> CART <-> CHECKOUT  -> COMPLETE
 */
export default interface Cart extends ORM, StateFlow {
    id: string;
    cartId: string;
    dishes: Association<CartDish>;
    dishesCount: number;
    uniqueDishes: number;
    cartTotal: number;
    modifiers: Modifier[];
    delivery: number;
    customer: Customer;
    address: Address;
    comment: string;
    personsCount: number;
    problem: boolean;
    sendToIiko: boolean;
    rmsId: string;
    deliveryStatus: number;
    selfDelivery: boolean;
    deliveryDescription: string;
    message: string;
    deliveryItem: string;
    totalWeight: number;
    total: number;
    /**
     * Добавление блюда в текущую корзину, указывая количество, модификаторы, комментарий и откуда было добавлено блюдо.
     * Если количество блюд ограничено и требуется больше блюд, нежели присутствует, то сгенерировано исключение.
     * Переводит корзину в состояние CART, если она ещё не в нём.
     * @param dish - Блюдо для добавления, может быть объект или id блюда
     * @param amount - количетво
     * @param modifiers - модификаторы, которые следует применить к текущему блюду
     * @param comment - комментарий к блюду
     * @param from - указатель откуда было добавлено блюдо (например, от пользователя или от системы акций)
     * @throws Object {
     *   body: string,
     *   code: number
     * }
     * where codes:
     *  1 - не достаточно блюд
     *  2 - заданное блюдо не найдено
     * @fires cart:core-cart-before-add-dish - вызывается перед началом функции. Результат подписок игнорируется.
     * @fires cart:core-cart-add-dish-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.
     * @fires cart:core-cart-add-dish-before-create-cartdish - вызывается, если все проверки прошли успешно и корзина намеряна
     * добавить блюдо. Результат подписок игнорируется.
     * @fires cart:core-cart-after-add-dish - вызывается после успешного добавления блюда. Результат подписок игнорируется.
     */
    addDish(dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, from: string): Promise<void>;
    /**
     * Уменьшает количество заданного блюда на amount. Переводит корзину в состояние CART.
     * @param dish - Блюдо для изменения количества блюд
     * @param amount - насколько меньше сделать количество
     * @throws Object {
     *   body: string,
     *   code: number
     * }
     * where codes:
     *  1 - заданный CartDish не найден в текущей корзине
     *  @fires cart:core-cart-before-remove-dish - вызывается перед началом фунции. Результат подписок игнорируется.
     *  @fires cart:core-cart-remove-dish-reject-no-cartdish - вызывается, если dish не найден в текущей корзине. Результат подписок игнорируется.
     *  @fires cart:core-cart-after-remove-dish - вызывается после успешной работы функции. Результат подписок игнорируется.
     */
    removeDish(dish: CartDish, amount: number): Promise<void>;
    /**
     * Устанавливает заданное количество для заданного блюда в текущей корзине. Если количество меньше 0, то блюдо будет
     * удалено из корзины. Переводит корзину в состояние CART.
     * @param dish - какому блюду измениять количество
     * @param amount - новое количество
     * @throws Object {
     *   body: string,
     *   code: number
     * }
     * where codes:
     *  1 - нет такого количества блюд
     *  2 - заданный CartDish не найден
     * @fires cart:core-cart-before-set-count - вызывается перед началом фунции. Результат подписок игнорируется.
     * @fires cart:core-cart-set-count-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.
     * @fires cart:core-cart-after-set-count - вызывается после успешной работы функции. Результат подписок игнорируется.
     * @fires cart:core-cart-set-count-reject-no-cartdish - вызывается, если dish не найден в текущей корзине. Результат подписок игнорируется.
     */
    setCount(dish: CartDish, amount: number): Promise<void>;
    /**
     * Устанавливает заданному модификатору в заданом блюде в текузей заданное количество.
     * В случае успешной работы изменяет состояние корзины в CART
     * @param dish - блюдо, модификатор которого изменять
     * @param modifier - id блюда, которое привязано к модификатору, количество которого менять
     * @param amount - новое количество
     * @throws Object {
     *   body: string,
     *   code: number
     * }
     * where codes:
     * 1 - нет достаточного количества блюд
     * 2 - dish не найден в текущей корзине
     * 3 - блюдо modifier не найден как модификатор блюда dish
     * 4 - блюдо dish в текущей корзине не содержит модификатора modifier
     * @fires cart:core-cart-before-set-modifier-count - вызывается перед началом фунции. Результат подписок игнорируется.
     * @fires cart:core-cart-set-modifier-count-reject-amount - вызывается перед ошибкой о недостатке блюд. Результат подписок игнорируется.
     * @fires cart:core-cart-set-modifier-count-reject-no-cartdish - вызывается перед ошибкой с кодом 2. Результат подписок игнорируется.
     * @fires cart:core-cart-set-modifier-count-reject-no-modifier-dish - вызывается перед ошибкой с кодом 3. Результат подписок игнорируется.
     * @fires cart:core-cart-set-modifier-count-reject-no-modifier-in-dish - вызывается перед ошибкой с кодом 4. Результат подписок игнорируется.
     * @fires cart:core-cart-after-set-modifier-count - вызывается после успешной работы функции. Результат подписок игнорируется.
     */
    setModifierCount(dish: CartDish, modifier: Dish, amount: number): Promise<void>;
    /**
     * Меняет комментарий заданного блюда в текущей корзине
     * @param dish - какому блюду менять комментарий
     * @param comment - новый комментарий
     * @throws Object {
     *   body: string,
     *   error: number
     * }
     * where codes:
     * 1 - блюдо dish не найдено в текущей корзине
     * @fires cart:core-cart-before-set-comment - вызывается перед началом фунции. Результат подписок игнорируется.
     * @fires cart:core-cart-set-comment-reject-no-cartdish - вызывается перед ошибкой о том, что блюдо не найдено. Результат подписок игнорируется.
     * @fires cart:core-cart-after-set-comment - вызывается после успешной работы функции. Результат подписок игнорируется.
     */
    setComment(dish: CartDish, comment: string): Promise<void>;
    /**
     * Меняет поле корзины selfDelivery на заданное. Используйте только этот метод для изменения параметра selfDelivery.
     * @param selfService
     */
    setSelfDelivery(selfService: boolean): Promise<void>;
    /**
     * Проверяет ваидность customer. Проверка проходит на наличие полей и их валидность соответсвенно nameRegex и phoneRegex
     * из конфига. Если указан isSelfService: false, то так же проверяется валидность address на наличие полей и вызывается
     * `core-cart-check` событие. Каждый подписанный елемент влияет на результат проверки. В зависимости от настроек функция
     * отдаёт успешность проверки.
     * @param customer - данные заказчика
     * @param isSelfService - является ли самовывозов
     * @param address - адресс, обязательный, если это самовывоз
     * @return Результат проверки. Если проверка данных заказчика или адресса в случае самомвывоза дали ошибку, то false. Иначе,
     * если в конфиге checkConfig.requireAll==true, то успех функции только в случае, если все подписки `core-cart-check` вернули положительный результат работы.
     * Если в конфгие checkConfig.notRequired==true, то независимо от результата всех подписчиков `core-cart-check` будет положительный ответ.
     * Иначе если хотя бы один подписчик `core-cart-check` ответил успешно, то вся функция считается успешной.
     * Если результат был успешен, то корзина переходит из состояния CART в CHECKOUT.
     * @fires cart:core-cart-before-check - вызывается перед началом функции. Результат подписок игнорируется.
     * @fires cart:core-cart-check-self-service - вызывается если isSelfService==true перед начало логики изменения корзины. Результат подписок игнорируется.
     * @fires cart:core-cart-check-delivery - вызывается после проверки customer если isSelfService==false. Результат подписок игнорируется.
     * @fires cart:core-cart-check - проверка заказа на возможность исполнения. Результат исполнения каждого подписчика влияет на результат.
     * @fires cart:core-cart-after-check - событие сразу после выполнения основной проверки. Результат подписок игнорируется.
     */
    check(customer: Customer, isSelfService: boolean, address?: Address): Promise<boolean>;
    /**
     * Вызывет core-cart-order. Каждый подписанный елемент влияет на результат заказа. В зависимости от настроек функция
     * отдаёт успешность заказа.
     * @return код результата:
     *  - 0 - успешно проведённый заказ от всех слушателей.
     *  - 1 - ни один слушатель не смог успешно сделать заказ.
     *  - 2 - по крайней мере один слушатель успешно выполнил заказ.
     * @fires cart:core-cart-before-order - вызывается перед началом функции. Результат подписок игнорируется.
     * @fires cart:core-cart-order-self-service - вызывается, если совершается заказ с самовывозом.
     * @fires cart:core-cart-order-delivery - вызывается, если заказ без самовывоза
     * @fires cart:core-cart-order - событие заказа. Каждый слушатель этого события влияет на результат события.
     * @fires cart:core-cart-after-order - вызывается сразу после попытки оформить заказ.
     */
    order(): Promise<number>;
}
/**
 * Описывает класс Cart, содержит статические методы, используется для ORM
 */
export interface CartModel extends ORMModel<Cart> {
    /**
     * Возвращает корзину со всем популярищациями, то есть каждый CartDish в заданой cart имеет dish и modifiers, каждый dish
     * содержит в себе свои картинки, каждый модификатор внутри cart.dishes и каждого dish содержит группу модификаторов и
     * самоблюдо модификатора и тд.
     * @param cart
     */
    returnFullCart(cart: Cart): Promise<Cart>;
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * @param cart
     */
    countCart(cart: Cart): any;
}
declare global {
    const Cart: CartModel;
}
