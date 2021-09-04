import Group from "./Group";
import checkExpression, {AdditionalInfo} from "../libs/checkExpression";
import Image from "./Image";
import hashCode from "../libs/hashCode";
import getEmitter from "../libs/getEmitter";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import * as _ from "lodash";
import { WorkTime } from "@webresto/worktime";

let attributes = {


    /** */
    id: {
      type: 'string',
      required: true
    } as unknown as string,

    /** */
    rmsId: {
      type: 'string',
      required: true
    } as unknown as string,

    /** */
    additionalInfo: {
      type: 'string',
      allowNull: true
    } as unknown as string,

    /** Артикул */
    code: {
      type: 'string',
      allowNull: true
    } as unknown as string,

    /** Описание блюда */
    description: 'string',

    /** Наименование */
    name: 'string',

    /** SEO description */
    seoDescription: 'string',

    /** SEO keywords */
    seoKeywords: 'string',

    /** SEO text */
    seoText: 'string',

    /** SEO title */
    seoTitle: 'string',

    /** Не печатать в чеке */
    doNotPrintInCheque: 'boolean' as unknown as boolean,

    /** Количество углеводов на (100гр)*/
    carbohydrateAmount: 'number' as unknown as number,

    /** Количество углеводов в блюде */
    carbohydrateFullAmount: 'number' as unknown as number,

    /** Енергетическая ценность (100гр) */
    energyAmount: 'number' as unknown as number,

    /** Енергетическая ценность */
    energyFullAmount: 'number' as unknown as number,

    /**  Колличество жиров (100гр) */
    fatAmount: 'number' as unknown as number,

    /** Колличество жиров в блюде */
    fatFullAmount: 'number' as unknown as number,

    /** Количество белков (100гр)  */
    fiberAmount: 'number' as unknown as number,

    /** Количество белков в блюде */
    fiberFullAmount: 'number' as unknown as number,

    /** Идентификатор группы в которой находится блюдо */
    groupId: 'string',

    /** Единица измерения товара ( кг, л, шт, порц.) */
    measureUnit: 'string',

    /** Цена блюда */
    price: 'number' as unknown as number,

    /**  */
    productCategoryId: 'string', //TODO: ???

    /** Тип */
    type: 'string', //TODO: ???

    /** Масса  */
    weight: 'number' as unknown as number,

    /** Порядок сортировки */
    order: 'number' as unknown as number,

    /** Блюдо удалено */
    isDeleted: 'boolean' as unknown as boolean,

    /** Блюдо может быть модифичироанно */
    isModificable: 'boolean' as unknown as boolean,

    /** Модифакторы блюда */
    modifiers: {
      // collection: 'dish'
      type: 'json'
    } as unknown as any,

    /** Родительская группа */
    parentGroup: {
      model: 'group'
    } as unknown as Group,

    /** Теги для фильтрации (Вегетарианский, острый...) */
    tags: {
      type: 'json'
    } as unknown as any,

    /** Баланс для продажи, если -1 то сколько угодно */
    balance: {
      type: 'number',
      defaultsTo: -1
    }as unknown as number,

    /** Список изображений блюда*/
    images: {
      collection: 'image',
      via: 'dish'
    }as unknown as Image,

    /** Слаг */
    slug: {
      type: 'string',
    } as unknown as string,

    /** Хеш обекта блюда */
    hash: 'string',

    /** Можно увидеть на сайте в меню */
    visible: 'boolean' as unknown as boolean,

    /** Признак что это модификатор */
    modifier: 'boolean' as unknown as boolean,

    /** Признак того что блюдо акционное */
    promo: 'boolean' as unknown as boolean,
 
    /** Время работы */
    workTime: 'json' as unknown as WorkTime
  }

type Dish = typeof attributes & ORM
export default Dish

let Model = {
  afterUpdate: function (record, proceed) {
    getEmitter().emit('core-dish-after-update', record);
    return proceed();
  },

  /**
   * Принимает waterline criteria и дописывает, туда isDeleted = false, balance != 0. Таким образом эта функция позволяет
   * находить в базе блюда по критерию и при этом такие, что с ними можно работать юзеру.
   * @param criteria - критерии поиска
   * @return найденные блюда
   */
  async getDishes(criteria: any = {}): Promise<Dish[]> {
    criteria.isDeleted = false;

    if (! await Settings.use('ShowUnavailableDishes')) {
      criteria.balance = {'!': 0};
    }
      

    let dishes = await Dish.find(criteria).populate('images');

    await Promise.each(dishes, async (dish) => {
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

    await getEmitter().emit('core-dish-get-dishes', dishes);
    return dishes;
  },

  /**
   * Популяризирует модификаторы блюда, то есть всем груповым модификаторам дописывает группу и блюда, которые им соответствуют,
   * а обычным модификаторам дописывает их блюдо.
   * @param dish
   */
  async getDishModifiers(dish: Dish) {
    if(dish.modifiers){
      let index = 0;
      for await(let  modifier of dish.modifiers){
        // group modofiers
        if (modifier.childModifiers && modifier.childModifiers.length > 0) {
          
          if (dish.modifiers[index].modifierId !== undefined){
            dish.modifiers[index].group = await Group.findOne({id: modifier.modifierId});
          }
          let childIndex=0
          for await(let childModifier of modifier.childModifiers){
            let childModifierDish = await Dish.findOne({id: childModifier.modifierId}).populate('images')
            if (!childModifierDish || childModifierDish.balance === 0){
              // delete if dish not found
              dish.modifiers.splice(childIndex, 1);
              sails.log.error("DISH > getDishModifiers: Modifier "+ childModifier.modifierId +" from dish:"+dish.name+" not found")
            } else {
              try {
                dish.modifiers[index].childModifiers[childIndex].dish = childModifierDish;
            } catch (error) {
                sails.log.error("DISH > getDishModifiers: problem with: "+ childModifier.modifierId+ " in dish:"+ dish.name );
            }
            }
            childIndex++;
          }
        } else {
          sails.log.error("DISH > getDishModifiers: GroupModifier "+ modifier.id +" from dish:"+ dish.name+" not have modifiers")
          dish.modifiers[index].dish = await Dish.findOne({id: modifier.id}).populate('images');
        }
        index++;
      }
    }
    dish.groupModifiers=null;
  },

  /**
   * Проверяет существует ли блюдо, если не сущестует, то создаёт новое и возвращает его. Если существует, то сверяет
   * хеш существующего блюда и новых данных, если они идентифны, то сразу же отдаёт блюда, если нет, то обновляет его данные
   * на новые
   * @param values
   * @return обновлённое или созданное блюдо
   */
  async createOrUpdate(values: Dish): Promise<Dish> {
    let hash = hashCode(JSON.stringify(values));
    const dish = await Dish.findOne({id: values.id});
    if (!dish) {
      return Dish.create({hash, ...values}).fetch();
    } else {
      if (hash === dish.hash) {
        return dish;
      }
      return (await Dish.update({id: values.id}, {hash, ...values}).fetch())[0];
    }
  }
};


module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model
}

declare global {
  const Dish: typeof Model & ORMModel<Dish>;
}
