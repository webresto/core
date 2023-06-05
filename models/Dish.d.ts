import MediaFile from "./MediaFile";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { WorkTime } from "@webresto/worktime";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { GroupModifier } from "../interfaces/Modifier";
declare let attributes: {
    /** */
    id: string;
    /** */
    rmsId: string;
    /** */
    additionalInfo: string;
    /** Артикул */
    code: string;
    /** Описание блюда */
    description: string;
    /** Ingredients of dish */
    ingredients: string;
    /** Наименование */
    name: string;
    /** SEO description */
    seoDescription: string;
    /** SEO keywords */
    seoKeywords: string;
    /** SEO text */
    seoText: string;
    /** SEO title */
    seoTitle: string;
    /** Не печатать в чеке */
    doNotPrintInCheque: boolean;
    /** Количество углеводов на (100гр)*/
    carbohydrateAmount: number;
    /** Количество углеводов в блюде */
    carbohydrateFullAmount: number;
    /** Енергетическая ценность (100гр) */
    energyAmount: number;
    /** Енергетическая ценность */
    energyFullAmount: number;
    /**  Колличество жиров (100гр) */
    fatAmount: number;
    /** Колличество жиров в блюде */
    fatFullAmount: number;
    /** Количество белков (100гр)  */
    fiberAmount: number;
    /** Количество белков в блюде */
    fiberFullAmount: number;
    /** Идентификатор группы в которой находится блюдо */
    groupId: string;
    /** Единица измерения товара ( кг, л, шт, порц.) */
    measureUnit: string;
    /** Цена блюда */
    price: number;
    /**  */
    productCategoryId: string;
    /** Тип */
    type: string;
    /** Масса  */
    weight: number;
    /** Порядок сортировки */
    sortOrder: number;
    /** Блюдо удалено */
    isDeleted: boolean;
    /** Блюдо может быть модифичироанно */
    isModificable: boolean;
    /** Модифакторы блюда */
    modifiers: GroupModifier[];
    /** Родительская группа */
    parentGroup: any;
    /** Теги для фильтрации (Вегетарианский, острый...) */
    tags: any;
    /** Баланс для продажи, если -1 то сколько угодно */
    balance: number;
    /** Список изображений блюда*/
    images: MediaFile[];
    /** Слаг */
    slug: string;
    /** Концепт к которому относится блюдо */
    concept: string;
    /** Хеш обекта блюда */
    hash: string;
    /** Можно увидеть на сайте в меню */
    visible: boolean;
    /** Признак что это модификатор */
    modifier: boolean;
    /** Признак того что блюдо акционное */
    promo: boolean;
    /** Время работы */
    worktime: WorkTime[];
};
type attributes = typeof attributes;
interface Dish extends RequiredField<OptionalAll<attributes>, "name" | "price">, ORM {
}
export default Dish;
declare let Model: {
    beforeCreate(init: any, cb: (err?: string) => void): void;
    beforeUpdate: (record: any, cb: (err?: string) => void) => void;
    afterUpdate: (record: any, cb: (err?: string) => void) => void;
    afterCreate: (record: any, cb: (err?: string) => void) => void;
    /**
     * Принимает waterline criteria и дописывает, туда isDeleted = false, balance != 0. Таким образом эта функция позволяет
     * находить в базе блюда по критерию и при этом такие, что с ними можно работать юзеру.
     * @param criteria - критерии поиска
     * @return найденные блюда
     */
    getDishes(criteria?: any): Promise<Dish[]>;
    /**
     * Популяризирует модификаторы блюда, то есть всем груповым модификаторам дописывает группу и блюда, которые им соответствуют,
     * а обычным модификаторам дописывает их блюдо.
     * @param dish
     */
    getDishModifiers(dish: Dish): Promise<Dish>;
    /**
     * Проверяет существует ли блюдо, если не сущестует, то создаёт новое и возвращает его. Если существует, то сверяет
     * хеш существующего блюда и новых данных, если они идентифны, то сразу же отдаёт блюда, если нет, то обновляет его данные
     * на новые
     * @param values
     * @return обновлённое или созданное блюдо
     */
    createOrUpdate(values: Dish): Promise<Dish>;
};
declare global {
    const Dish: typeof Model & ORMModel<Dish, "name" | "price">;
}
