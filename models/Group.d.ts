import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import MediaFile from "../models/MediaFile";
import Dish from "../models/Dish";
import { WorkTime } from "@webresto/worktime";
import { OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /**Id */
    id: string;
    /** ID in external system */
    rmsId: string;
    /** Addishinal info */
    additionalInfo: string;
    /** */
    code: string;
    description: string;
    /** Soft deletion */
    isDeleted: boolean;
    /** Dishes group name*/
    name: string;
    seoDescription: string;
    seoKeywords: string;
    seoText: string;
    seoTitle: string;
    /** Sorting weight */
    sortOrder: number;
    dishes: Dish[];
    parentGroup: any;
    childGroups: string[] | Group[];
    /** Icon */
    icon: string;
    /** Images */
    images: MediaFile[];
    /** Плейсхолдер для блюд группы */
    dishesPlaceholder: MediaFile[];
    /** Человеко читаемый АйДи */
    slug: string;
    /** Концепт к которому относится группа */
    concept: string;
    /** Гурппа отображается */
    visible: boolean;
    /** Группа модификаторов */
    modifier: boolean;
    /** Промо группа */
    promo: boolean;
    /** Время работы */
    worktime: WorkTime[];
};
type attributes = typeof attributes;
interface Group extends OptionalAll<attributes>, ORM {
}
export default Group;
declare let Model: {
    beforeCreate(init: any, cb: (err?: string) => void): void;
    beforeUpdate: (record: any, cb: (err?: string) => void) => void;
    afterUpdate: (record: any, cb: (err?: string) => void) => void;
    afterCreate: (record: any, cb: (err?: string) => void) => void;
    /**
     * Возвращает объект с группами и ошибками получения этих самых групп.
     * @deprecated not used
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
    getGroups(groupsId: string[]): Promise<{
        groups: GroupWithAdditionalFields[];
        errors: {};
    }>;
    /**
     * Возвращает группу с заданным id
     * @deprecated not used
     * @param groupId - id группы
     * @return запрашиваемая группа
     * @throws ошибка получения группы
     * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
     */
    getGroup(groupId: string): Promise<Group>;
    /**
     * Returns a group with a given Slug
     * @deprecated not used
     * @param groupSlug - slug группы
     * @return запрашиваемая группа
     * @throws ошибка получения группы
     * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
     */
    getGroupBySlug(groupSlug: string): Promise<Group>;
    /**
     * Menu for navbar
     * */
    getMenuGroups(concept: string, topLevelGroupId?: string): Promise<Group[]>;
    /**
     * Проверяет существует ли группа, если не сущестует, то создаёт новую и возвращает её.
     * @param values
     * @return обновлённая или созданная группа
     */
    createOrUpdate(values: Group): Promise<Group>;
};
/**
 * Описывает группу блюд в момент получения её популяризированной версии, дополнительные поля являются ошибкой фреймворка
 */
export interface GroupWithAdditionalFields extends Group {
    childGroups: Group[];
    dishesList: Dish[];
}
declare global {
    const Group: typeof Model & ORMModel<Group, null>;
}
