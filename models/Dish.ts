import Group from "./Group";
import checkExpression, { AdditionalInfo } from "../libs/checkExpression";
import MediaFile from "./MediaFile";
import hashCode from "../libs/hashCode";

import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import * as _ from "lodash";
import { WorkTime } from "@webresto/worktime";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { GroupModifier, Modifier } from "../interfaces/Modifier";

let attributes = {
  /** */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** */
  rmsId: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** */
  additionalInfo: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Артикул */
  code: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Описание блюда */
  description: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Ingredients of dish */
  ingredients: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Наименование */
  name: {
    type: "string",
    required: true,
  } as unknown as string,

  /** SEO description */
  seoDescription: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** SEO keywords */
  seoKeywords: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** SEO text */
  seoText: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** SEO title */
  seoTitle: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Не печатать в чеке */
  doNotPrintInCheque: "boolean" as unknown as boolean,

  /** Количество углеводов на (100гр)*/
  carbohydrateAmount: "number" as unknown as number,

  /** Количество углеводов в блюде */
  carbohydrateFullAmount: "number" as unknown as number,

  /** Енергетическая ценность (100гр) */
  energyAmount: "number" as unknown as number,

  /** Енергетическая ценность */
  energyFullAmount: "number" as unknown as number,

  /**  Колличество жиров (100гр) */
  fatAmount: "number" as unknown as number,

  /** Колличество жиров в блюде */
  fatFullAmount: "number" as unknown as number,

  /** Количество белков (100гр)  */
  fiberAmount: "number" as unknown as number,

  /** Количество белков в блюде */
  fiberFullAmount: "number" as unknown as number,

  /** Идентификатор группы в которой находится блюдо */
  groupId: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Единица измерения товара ( кг, л, шт, порц.) */
  measureUnit: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Цена блюда */
  price: "number" as unknown as number,

  /**  */
  productCategoryId: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Тип */
  type: "string", //TODO: ???

  /** Масса  */
  weight: "number" as unknown as number,

  /** Порядок сортировки */
  sortOrder: "number" as unknown as number,

  /** Блюдо удалено */
  isDeleted: "boolean" as unknown as boolean,

  /** Блюдо может быть модифичироанно */
  isModificable: "boolean" as unknown as boolean,

  /** Модифакторы блюда */
  modifiers: {
    // collection: 'dish'
    type: "json",
  } as unknown as GroupModifier[],

  /** Родительская группа */
  parentGroup: {
    model: "group",
  } as unknown as Group | any,

  /** Теги для фильтрации (Вегетарианский, острый...) */
  tags: {
    type: "json",
  } as unknown as any,

  /** Баланс для продажи, если -1 то сколько угодно */
  balance: {
    type: "number",
    defaultsTo: -1,
  } as unknown as number,

  /** Список изображений блюда*/
  images: {
    collection: "mediafile",
    via: "dish",
  } as unknown as MediaFile[],

  /** Слаг */
  slug: {
    type: "string",
  } as unknown as string,

  /** Концепт к которому относится блюдо */
  concept: "string",

  /** Хеш обекта блюда */
  hash: "string",

  /** Можно увидеть на сайте в меню */
  visible: "boolean" as unknown as boolean,

  /** Признак что это модификатор */
  modifier: "boolean" as unknown as boolean,

  /** Признак того что блюдо акционное */
  promo: "boolean" as unknown as boolean,

  /** Время работы */
  worktime: "json" as unknown as WorkTime[],
};

type attributes = typeof attributes;
interface Dish extends RequiredField<OptionalAll<attributes>, "name" | "price">, ORM {}
export default Dish;

let Model = {
  beforeCreate(init: any, next: any) {
    emitter.emit('core:dish-before-create', init);
    if (!init.id) {
      init.id = uuid();
    }

    if (!init.concept) {
      init.concept = "origin"
    }
    next();
  },

  beforeUpdate: function (record, proceed) {
    emitter.emit('core:dish-before-update', record);
    return proceed();
  },

  afterUpdate: function (record, proceed) {
    emitter.emit('core:dish-after-update', record);
    return proceed();
  },

  afterCreate: function (record, proceed) {
    emitter.emit('core:dish-after-create', record);
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

    if (!(await Settings.get("ShowUnavailableDishes"))) {
      criteria.balance = { "!=": 0 };
    }

    let dishes = await Dish.find(criteria).populate("images");

    for await (let dish of dishes) {
      const reason = checkExpression(dish as Pick<typeof dish, "worktime" | "visible" | "promo" | "modifier">);
      if (!reason) {
        await Dish.getDishModifiers(dish);
        if (dish.images.length >= 2) dish.images.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
      } else {
        dishes.splice(dishes.indexOf(dish), 1);
      }
    }

    dishes.sort((a, b) => a.sortOrder - b.sortOrder);

    await emitter.emit("core-dish-get-dishes", dishes);
    return dishes;
  },

  /**
   * Популяризирует модификаторы блюда, то есть всем груповым модификаторам дописывает группу и блюда, которые им соответствуют,
   * а обычным модификаторам дописывает их блюдо.
   * @param dish
   */
   async getDishModifiers(dish: Dish): Promise<Dish> {

    if(dish.modifiers){
      let index = 0;
      
      // group modofiers
      for await(let  modifier of dish.modifiers){
        
        let childIndex=0
        let childModifiers = []
        
        
        
        // assign group
        if (dish.modifiers[index].modifierId !== undefined){
            dish.modifiers[index].group = await Group.findOne({id: modifier.modifierId});
          }
          
          if (!modifier.childModifiers) modifier.childModifiers = [];
          
          for await(let childModifier of modifier.childModifiers){

            let childModifierDish = await Dish.findOne({id: childModifier.modifierId}).populate('images')
            if (!childModifierDish || (childModifierDish && childModifierDish.balance === 0)){
              // delete if dish not found
              sails.log.warn("DISH > getDishModifiers: Modifier "+ childModifier.modifierId +" from dish:"+dish.name+" not found")
            } else {
              try {
                childModifier.dish = childModifierDish
                childModifiers.push(childModifier);
              } catch (error) {
                  sails.log.error("DISH > getDishModifiers: problem with: "+ childModifier.modifierId+ " in dish:"+ dish.name );
              }
            }
            childIndex++;
          }
          // 
          
          dish.modifiers[index].childModifiers = childModifiers;
          
          // If groupMod not have options delete it
          if (modifier.childModifiers && !modifier.childModifiers.length) {  
            sails.log.warn("DISH > getDishModifiers: GroupModifier "+ modifier.id +" from dish:"+ dish.name+" not have modifiers")
            dish.modifiers.splice(index, 1);
          }
          index++;
        }
    }
    return dish
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
    const dish = await Dish.findOne({ id: values.id });
    if (!dish) {
      return Dish.create({ hash, ...values }).fetch();
    } else {
      if (hash === dish.hash) {
        return dish;
      }
      return (await Dish.update({ id: values.id }, { hash, ...values }).fetch())[0];
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Dish: typeof Model & ORMModel<Dish, "name" | "price">;
}
