/**
 * @api {API} Group Group
 * @apiGroup Models
 * @apiDescription Группы. Содержат в себе блюда и другие группы
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
 * @apiParam {Float} code Артикул
 * @apiParam {String} description Описание
 * @apiParam {Boolean} isDeleted Удалён ли продукт в меню, отдаваемого клиенту
 * @apiParam {String} name Название
 * @apiParam {String} seoDescription SEO-описание для клиента
 * @apiParam {String} seoKeywords SEO-ключевые слова
 * @apiParam {String} seoText SEO-текст для роботов
 * @apiParam {String} seoTitle SEO-заголовок
 * @apiParam {Tags} tags Тэги
 * @apiParam {Boolean} isIncludedInMenu Нужно ли продукт отображать в дереве номенклатуры
 * @apiParam {Float} order Порядок отображения
 * @apiParam {Tags[]} dishesTags Тэги всех блюд, что есть в этой группе
 * @apiParam {[Dish](#api-Models-ApiDish)[]} dishes Блюда, содержашиеся в этой группе
 * @apiParam {[Group](#api-Models-ApiGroup)} parentGroup Родительская группа
 * @apiParam {[Group](#api-Models-ApiGroup)[]} childGroups Дочерние группы
 * @apiParam {[Image](#api-Models-ApiImage)[]} images Картинки группы
 * @apiParam {String} slug Текстовое названия группы в транслите
 *
 */

import checkExpression, {AdditionalInfo} from "../lib/checkExpression";
import getEmitter from "../lib/getEmitter";
import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import Image from "../models/Image";
import Dish from "../models/Dish";

module.exports = {
  primaryKey: 'id',
  attributes: {
    id: {
      type: 'string',
      required: true,
      
    },
    additionalInfo: 'string',
    code: 'number',
    description: 'string',
    isDeleted: 'boolean',
    name: 'string',
    seoDescription: 'string',
    seoKeywords: 'string',
    seoText: 'string',
    seoTitle: 'string',
    tags: {
      // collection: 'tags'
      type: 'json'
    },
    isIncludedInMenu: 'boolean',
    order: 'number',
    dishesTags: {
      // collection: 'tags'
      type: 'json'
    },
    dishes: {
      collection: 'dish',
      via: 'parentGroup'
    },
    parentGroup: {
      model: 'group'
    },
    childGroups: {
      collection: 'group',
      via: 'parentGroup'
    },
    images: {
      collection: 'image',
      via: 'group'
    },
    slug: {
      type: 'slug',
      from: 'name'
    },
    visible: 'boolean',
    modifier: 'boolean',
    promo: 'boolean',
    workTime: 'json'
  },

  /**
   * Возвращает объект с группами и ошибками получения этих самых групп.
   * @param groupsId - массив id групп, которые следует получить
   * @return Object {
   *   groups: [],
   *   errors: {}
   * }
   * где groups это массив, запрошеных групп с полным отображением вложенности, то есть с их блюдами, у блюд их модфикаторы
   * и картинки, есть картинки группы и тд, а errors это объект, в котором ключи это группы, которые невозможно получить
   * по некоторой приниче, значения этого объекта это причины по которым группа не была получена.
   * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
   */
  async getGroups(groupsId: string[]): Promise<{ groups: GroupWithAdditionalFields[], errors: {} }> {
    let menu = {} as {[x: string]: GroupWithAdditionalFields};
    const groups = await Group.find({
      id: groupsId,
      isDeleted: false
    }).populate('childGroups')
      .populate('dishes')
      .populate('images');

    const errors = {};

    await Promise.each(groups, async (group) => {
      const reason = checkExpression(group);
      if (!reason) {
        menu[group.id] = group as GroupWithAdditionalFields;

        if (group.childGroups) {
          let childGroups = [];
          const cgs = await Group.find({id: group.childGroups.map(cg => cg.id)})
            .populate('childGroups')
            .populate('dishes')
            .populate('images');
          await Promise.each(cgs, async (cg: Group) => {
            try {
              const data = await Group.getGroup(cg.id);
              if (data)
                childGroups.push(data);
            } catch (e) {
            }
          });
          delete menu[group.id].childGroups;
          menu[group.id].children = childGroups;
          if (menu[group.id].children.length > 1)
            menu[group.id].children.sort((a, b) => a.order - b.order);
        }
        menu[group.id].dishesList = await Dish.getDishes({parentGroup: group.id});
      } else {
        errors[group.id] = reason;
      }
    });

    await getEmitter().emit('core-group-get-groups', menu, errors);

    const res = Object.values(menu);

    //TODO: rewrite with throw
    return {groups: res, errors: errors};
  },

  /**
   * Возвращает группу с заданным id
   * @param groupId - id группы
   * @return запрашиваемая группа
   * @throws ошибка получения группы
   * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
   */
  async getGroup(groupId: string): Promise<Group> {
    const result = await this.getGroups([groupId]);
    if (result.errors[0]) {
      throw result.errors[0];
    }
    const group = result.groups;
    return group[0] ? group[0] : null;
  },

  /**
   * Возвращает группу с заданным slug'ом
   * @param groupSlug - slug группы
   * @return запрашиваемая группа
   * @throws ошибка получения группы
   * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
   */
  async getGroupBySlug(groupSlug: string): Promise<Group> {
    const groupObj = (await Group.findOne({slug: groupSlug}));

    if (!groupObj){
      throw "group with slug " + groupSlug + " not found"
    }
    const result = await this.getGroups([groupObj.id]);
    if (result.errors[0]) {
      throw result.errors[0];
    }

    const group = result.groups;
    return group[0] ? group[0] : null;
  },

  /**
   * Проверяет существует ли группа, если не сущестует, то создаёт новую и возвращает её.
   * @param values
   * @return обновлённая или созданная группа
   */
  async createOrUpdate(values: Group): Promise<Group> {
    const group = await Group.findOne({id: values.id});
    if (!group) {
      return Group.create(values);
    } else {
      return (await Group.update({id: values.id}, values))[0];
    }
  }
};

/**
 * Описывает группу блюд в момент получения её популяризированной версии, дополнительные поля являются ошибкой фреймворка
 */
export interface GroupWithAdditionalFields extends Group{
  children: Group[];
  dishesList: Dish[];
}

/**
 * Описывает группу блюд
 */
export default interface Group extends ORM, AdditionalInfo {
  id: string;
  additionalInfo: string;
  childGroups: Group[];
  parentGroup: Group;
  name: string;
  tags: {name: string}[];
  images: Association<Image>;
  isDeleted: boolean;

  code: number // TODO change ro string + same in dish
  description: string;
  seoDescription: string;
  seoKeywords: string;
  seoText: string;
  seoTitle: string;
  isIncludedInMenu: boolean;
  order: number;
  dishesTags: {name: string}[];
  dishes: Dish[];
  slug: string;
}

/**
 * Описывает класс Group, содержит статические методы, используется для ORM
 */
export interface GroupModel extends ORMModel<Group> {
  /**
   * Возвращает объект с группами и ошибками получения этих самых групп.
   * @param groupsId - массив id групп, которые следует получить
   * @return Object {
   *   groups: [],
   *   errors: {}
   * }
   * где groups это массив, запрошеных групп с полным отображением вложенности, то есть с их блюдами, у блюд их модфикаторы
   * и картинки, есть картинки группы и тд, а errors это объект, в котором ключи это группы, которые невозможно получить
   * по некоторой приниче, значения этого объекта это причины по которым группа не была получена.
   * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
   */
  getGroups(groupsId: string[]): Promise<{ groups: {}, errors: {} }>;

  /**
   * Возвращает группу с заданным id
   * @param groupId - id группы
   * @return запрашиваемая группа
   * @throws ошибка получения группы
   * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
   */
  getGroup(groupId: string): Promise<Group>;

  /**
   * Возвращает группу с заданным slug'ом
   * @param groupSlug - slug группы
   * @return запрашиваемая группа
   * @throws ошибка получения группы
   * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
   */
  getGroupBySlug(groupSlug: string): Promise<Group>;

  /**
   * Проверяет существует ли группа, если не сущестует, то создаёт новую и возвращает её. Если существует, то сверяет
   * хеш существующей группы и новых данных, если они совпали, то сразу же отдаёт группу, если нет, то обновляет её данные
   * на новые
   * @param values
   * @return обновлённая или созданная группа
   */
  createOrUpdate(values: Group): Promise<Group>;
}

declare global {
  const Group: GroupModel;
}
