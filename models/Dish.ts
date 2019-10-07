/**
 * @api {API} Dish Dish
 * @apiGroup Models
 * @apiDescription Модель блюда
 *
 * @apiParam {String} id Уникальный идентификатор
 * @apiParam {String} additionalInfo Дополнительная информация
 * @apiParamExample {JSON} additionalInfo
 * {
 *   workTime: [
 *    {
 *     dayOfWeek: 'monday',
 *     start: '8:00',
 *     end: '18:00'
 *    },
 *   ],
 *   visible: true|false,
 *   promo: true|false,
 *   modifier: true|false
 * }
 * @apiParam {String} code Артикул
 * @apiParam {String} description Описание
 * @apiParam {String} name Название
 * @apiParam {String} seoDescription SEO-описание для клиента
 * @apiParam {String} seoKeywords SEO-ключевые слова
 * @apiParam {String} seoText SEO-текст для роботов
 * @apiParam {String} seoTitle SEO-заголовок
 * @apiParam {Float} carbohydrateAmount Количество углеводов на 100 г блюда
 * @apiParam {Float} carbohydrateFullAmount Количество углеводов в блюде
 * @apiParam {Array} differentPricesOn Список терминалов, на которых цена продукта отличается от стандартной и цен на них
 * @apiParam {Boolean} doNotPrintInCheque Блюдо не нужно печатать на чеке. Актуально только для модификаторов
 * @apiParam {Float} energyAmount Энергетическая ценность на 100 г блюда
 * @apiParam {Float} energyFullAmount Энергетическая ценность в блюде
 * @apiParam {Float} fatAmount Количество жиров на 100 г блюда
 * @apiParam {Float} fatFullAmount Количество жиров в блюде
 * @apiParam {Float} fiberAmount Количество белков на 100 г блюда
 * @apiParam {Float} fiberFullAmount Количество белков в блюде
 * @apiParam {String} groupId Идентификатор группы
 * @apiParam {Array} groupModifiers Групповые модификаторы (не используется в пользу modifiers)
 * @apiParam {String} measureUnit Единица измерения товара ( кг, л, шт, порц.)
 * @apiParam {Float} price Цена
 * @apiParam {[Group](#api-Models-ApiGroup)} productCategoryId Идентификатор категории продукта
 * @apiParam {Array} prohibitedToSaleOn Список ID терминалов, на которых продукт запрещен к продаже
 * @apiParam {String} type Тип:
 dish - блюдо
 good - товар
 modifier - модификатор
 * @apiParam {Boolean} useBalanceForSell Товар продается на вес
 * @apiParam {Float} weight Вес одной единицы в кг
 * @apiParam {Boolean} isIncludedInMenu Нужно ли продукт отображать в дереве номенклатуры
 * @apiParam {Float} order Порядок отображения
 * @apiParam {Boolean} isDeleted Удалён ли продукт в меню, отдаваемого клиенту
 * @apiParam {JSON} modifiers Модификаторы доступные для данного блюда
 * @apiParam {[Group](#api-Models-ApiGroup)} parentGroup Группа, к которой принадлежит блюдо
 * @apiParam {JSON} tags Тэги
 * @apiParam {Integer} balance Количество оставшихся блюд. -1 - бесконечно
 * @apiParam {[Image](#api-Models-ApiImage)[]} images Картинки блюда
 * @apiParam {Integer} itemTotal
 * @apiParam {String} slug Текстовое названия блюда в транслите
 * @apiParam {Integer} hash Хеш данного состояния блюда
 * @apiParam {String} composition Состав блюда
 *
 */

import Modifier from "@webresto/core/modelsHelp/Modifier";
import Group from "@webresto/core/models/Group";
import checkExpression from "@webresto/core/lib/checkExpression";
import Image from "@webresto/core/models/Image";
import hashCode from "@webresto/core/lib/hashCode";
import Emitter from "@webresto/core/lib/emmiter";

// @ts-ignore
const Promise = require('bluebird');

declare const Dish;
declare const Group;

module.exports = {

  attributes: {
    id: {
      type: 'string',
      required: true,
      primaryKey: true
    },
    rmsId: {
      type: 'string',
      required: true
    },
    additionalInfo: 'string',
    code: 'string',
    description: 'string',
    name: 'string',
    seoDescription: 'string',
    seoKeywords: 'string',
    seoText: 'string',
    seoTitle: 'string',
    carbohydrateAmount: 'float',
    carbohydrateFullAmount: 'float',
    differentPricesOn: 'array',
    doNotPrintInCheque: 'boolean',
    energyAmount: 'float',
    energyFullAmount: 'float',
    fatAmount: 'float',
    fatFullAmount: 'float',
    fiberAmount: 'float',
    fiberFullAmount: 'float',
    groupId: 'string',
    groupModifiers: 'array',
    measureUnit: 'string',
    price: 'float',
    productCategoryId: 'string',
    prohibitedToSaleOn: 'array',
    type: 'string',
    useBalanceForSell: 'boolean',
    weight: 'float',
    isIncludedInMenu: 'boolean',
    order: 'float',
    isDeleted: 'boolean',
    modifiers: {
      // collection: 'dish'
      type: 'json'
    },
    parentGroup: {
      model: 'group'
    },
    tags: {
      type: 'json'
      // collection: 'tags',
      // via: 'dishes',
      // dominant: true
    },
    balance: {
      type: 'integer',
      defaultsTo: -1
    },
    images: {
      collection: 'image',
      via: 'dish'
    },
    slug: {
      type: 'slug',
      from: 'name'
    },
    hash: 'integer',
    composition: 'string'
  },

  /**
   * Get only not deleted dishes
   * @param criteria
   */
  async getDishes(criteria): Promise<Dish[]> {
    if (!criteria)
      criteria = {};
    criteria.isDeleted = false;
    criteria.balance = {'!': 0};

    const dishes = <Dish[]>await Dish.find(criteria).populate('images');

    await Promise.each(dishes, async (dish: Dish) => {
      const reason = checkExpression(dish);
      if (!reason) {
        await Dish.getDishModifiers(dish);
        if (dish.images.length >= 2)
          dish.images.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
      } else {
        dishes.splice(dishes.indexOf(dish), 1);
      }
    });

    dishes.sort((a, b) => a.order - b.order);

    await Emitter.emit('core-dish-get-dishes', dishes);

    return dishes;
  },

  async getDishModifiers(dish: Dish) {
    await Promise.map(dish.modifiers, async (modifier: Modifier, index) => {
      if (modifier.childModifiers && modifier.childModifiers.length > 0) {
        dish.modifiers[index].group = <Group>await Group.findOne({id: modifier.modifierId});
        await Promise.map(modifier.childModifiers, async (modifier: Modifier, index1) => {
          dish.modifiers[index].childModifiers[index1].dish = <Dish>await Dish.findOne({id: modifier.modifierId});
        });
      } else {
        dish.modifiers[index].dish = <Dish>await Dish.findOne({id: modifier.id});
      }
    });
  },

  async createOrUpdate(values: Dish): Promise<Dish> {
    const dish = await Dish.findOne({id: values.id});
    if (!dish) {
      return await Dish.create(values);
    } else {
      if (hashCode(JSON.stringify(values)) === dish.hash) {
        return dish;
      }
      return (await Dish.update({id: values.id}, values))[0];
    }
  }
};

export default interface Dish {
  id: string;
  additionalInfo: string;
  balance: number;
  modifiers: Modifier[];
  parentGroup: Group;
  weight: number;
  price: number;
  order: number;
  images: Image[];
  name: string;
  composition: string;
}
