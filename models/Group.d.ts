import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import Dish from "../models/Dish";
declare let attributes: {
    /**Id */
    id: string;
    /** Addishinal info */
    additionalInfo: string;
    /** */
    code: string;
    description: string;
    /** Удалён ли продукт в меню, отдаваемого клиенту */
    isDeleted: boolean;
    /** Наименование блюда */
    name: string;
    seoDescription: string;
    seoKeywords: string;
    seoText: string;
    seoTitle: string;
    /** Очередь сортировки */
    order: number;
    /** Блюда группы */
    dishes: {};
    /** Родительская группа */
    parentGroup: any;
    /** Дочерние группы */
    childGroups: {};
    /** Изображения */
    images: {};
    /** Плейсхолдер для блюд группы */
    dishesPlaceholder: {};
    /** Человеко читаемый АйДи */
    slug: string;
    /** Гурппа отображается */
    visible: boolean;
    /** Группа модификаторов */
    modifier: boolean;
    /** Промо группа */
    promo: boolean;
    /** Время работы гыруппы */
    workTime: {};
};
declare type attributes = typeof attributes;
interface Group extends attributes, ORM {
}
export default Group;
declare let Model: {
    beforeCreate(record: any, proceed: any): any;
    beforeUpdate: (record: any, proceed: any) => any;
    afterUpdate: (record: any, proceed: any) => any;
    afterCreate: (record: any, proceed: any) => any;
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
    getGroups(groupsId: {}): any;
    /**
     * Возвращает группу с заданным id
     * @param groupId - id группы
     * @return запрашиваемая группа
     * @throws ошибка получения группы
     * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
     */
    getGroup(groupId: string): any;
    /**
     * Возвращает группу с заданным slug'ом
     * @param groupSlug - slug группы
     * @return запрашиваемая группа
     * @throws ошибка получения группы
     * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
     */
    getGroupBySlug(groupSlug: string): any;
    /**
     * Проверяет существует ли группа, если не сущестует, то создаёт новую и возвращает её.
     * @param values
     * @return обновлённая или созданная группа
     */
    createOrUpdate(values: Group): any;
};
/**
 * Описывает группу блюд в момент получения её популяризированной версии, дополнительные поля являются ошибкой фреймворка
 */
export interface GroupWithAdditionalFields extends Group {
    childGroups: Group[];
    dishesList: Dish[];
}
declare global {
    const Group: typeof Model & ORMModel<Group>;
}
