import checkExpression, { AdditionalInfo } from "../libs/checkExpression";
import getEmitter from "../libs/getEmitter";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import Image from "../models/Image";
import Dish from "../models/Dish";
import { WorkTime } from "@webresto/worktime";
import slugify from "slugify"
import { groupBy } from "lodash";
let attributes = {
  /**Id */
  id: {
    type: "string",
  } as unknown as string,

  /** Addishinal info */
  additionalInfo: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** */
  code: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  description: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  /** Удалён ли продукт в меню, отдаваемого клиенту */
  isDeleted: "boolean" as unknown as boolean,

  /** Наименование блюда */
  name: {
    type: "string",
    required: true,
  } as unknown as string,

  seoDescription: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  seoKeywords: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  seoText: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  seoTitle: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** Очередь сортировки */
  order: "number" as unknown as number,

  /** Блюда группы */
  dishes: {
    collection: "dish",
    via: "parentGroup",
  } as unknown as Dish[],

  /** Родительская группа */
  parentGroup: {
    model: "group",
  } as unknown as Group | any,

  /** Дочерние группы */
  childGroups: {
    collection: "group",
    via: "parentGroup",
  } as unknown as Group[],

  /** Изображения */
  images: {
    collection: "image",
    via: "group",
  } as unknown as Image[],

  /** Плейсхолдер для блюд группы */
  dishesPlaceholder: {
    model: "image",
  } as unknown as Image[],

  /** Человеко читаемый АйДи */
  slug: {
    type: "string",
  } as unknown as string,

  /** Гурппа отображается */
  visible: "boolean" as unknown as boolean,

  /** Группа модификаторов */
  modifier: "boolean" as unknown as boolean,

  /** Промо группа */
  promo: "boolean" as unknown as boolean,

  /** Время работы гыруппы */
  workTime: "json" as unknown as WorkTime[],
};

type attributes = typeof attributes;
interface Group extends attributes, ORM {}
export default Group;

let Model = {

  beforeUpdate: function (record, proceed) {
    getEmitter().emit('core:group-before-update', record);
    return proceed();
  },

  beforeCreate: function (record, proceed) {
    getEmitter().emit('core:group-before-create', record);
    return proceed();
  },

  afterUpdate: function (record, proceed) {
    getEmitter().emit('core:group-after-update', record);
    return proceed();
  },

  afterCreate: function (record, proceed) {
    getEmitter().emit('core:group-after-create', record);
    return proceed();
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
  async getGroups(groupsId: string[]): Promise<{ groups: GroupWithAdditionalFields[]; errors: {} }> {
    let menu = {} as { [x: string]: GroupWithAdditionalFields };
    const groups = await Group.find({ where: {
      id: groupsId,
      isDeleted: false,
    }})
      .populate("childGroups")
      .populate("dishes")
      .populate("images");

    const errors = {};
    for await(let group of groups) {
      const reason = checkExpression(group);
      if (!reason) {
        menu[group.id] = group as GroupWithAdditionalFields;

        if (group.childGroups) {
          let childGroups = [];
          const cgs = await Group.find({
            id: group.childGroups.map((cg) => cg.id),
          })
            .populate("childGroups")
            .populate("dishes")
            .populate("images");

          for await(let cg of cgs) {
            try {
              const data = await Group.getGroup(cg.id);
              if (data) childGroups.push(data);
            } catch (e) {}
          }

          delete menu[group.id].childGroups;
          menu[group.id].childGroups = childGroups;
          if (menu[group.id].childGroups.length > 1) menu[group.id].childGroups.sort((a, b) => a.order - b.order);

        }

        menu[group.id].dishesList = await Dish.getDishes({
          parentGroup: group.id,
        });
      } else {
        errors[group.id] = reason;
      }
    }

    await getEmitter().emit("core-group-get-groups", menu, errors);

    const res = Object.values(menu);

    //TODO: rewrite with throw
    return { groups: res, errors: errors };
  },

  /**
   * Возвращает группу с заданным id
   * @param groupId - id группы
   * @return запрашиваемая группа
   * @throws ошибка получения группы
   * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
   */
  async getGroup(groupId: string): Promise<Group> {
    const result = await Group.getGroups([groupId]);
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

    if (!groupSlug) throw "groupSlug is required"

    const groupObj = await Group.findOne({ slug: groupSlug });

    if (!groupObj) {
      throw "group with slug " + groupSlug + " not found";
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
    const group = await Group.findOne({ id: values.id });
    if (!group) {
      return Group.create(values).fetch();
    } else {
      return (await Group.update({ id: values.id }, values).fetch())[0];
    }
  },
};

/**
 * Описывает группу блюд в момент получения её популяризированной версии, дополнительные поля являются ошибкой фреймворка
 */
export interface GroupWithAdditionalFields extends Group {
  childGroups: Group[];
  dishesList: Dish[];
}

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Group: typeof Model & ORMModel<Group>;
}
