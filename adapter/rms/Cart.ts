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
 * @apiParam {Integer} cartTotal Полная стоимость корзины
 * @apiParam {Float} delivery Стоимость доставки
 * @apiParam {Boolean} problem Есть ли проблема с отправкой на IIKO
 * @apiParam {JSON} customer Данные о заказчике
 * @apiParam {JSON} address Данные о адресе доставки
 * @apiParam {String} comment Комментарий к заказу
 * @apiParam {Integer} personsCount Количество персон
 * @apiParam {Boolean} sendToIiko Был ли отправлен заказ IIKO
 * @apiParam {String} iikoId ID заказа, который пришёл от IIKO
 * @apiParam {String} deliveryStatus Статус состояния доставки (0 успешно расчитана)
 * @apiParam {Boolean} selfDelivery Признак самовывоза
 * @apiParam {String} deliveryDescription Строка дополнительной информации о доставке
 * @apiParam {String} message Сообщение, что отправляется с корзиной
 */

import Address from '@webresto/iiko-rms-adapter/models/Address';

export default interface Cart {
  id: number,
  cartId: string,
  dishes: any,
  dishesCount: number,
  uniqueDishes: number,
  cartTotal: number,
  modifiers: any,
  delivery: number,
  customer: {
    phone: string,
    mail?: string,
    name: string
  },
  address?: Address,
  comment: string,
  personsCount: number,
  problem: boolean,
  sendToIiko: boolean,
  iikoId: string,
  deliveryStatus: string,
  selfDelivery: boolean,
  deliveryDescription: string,
  message: string,
  deliveryItem: string,
  totalWeight: number,
  street: {
    name: string,
    classifierId: string
  }
};
