import MediaFile from "./MediaFile";
import { CriteriaQuery, ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { WorkTime } from "@webresto/worktime";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { GroupModifier } from "../interfaces/Modifier";
import { CustomData } from "../interfaces/CustomData";
declare let attributes: {
    /** */
    id: string;
    /** */
    rmsId: string;
    /** */
    additionalInfo: string;
    /** Article */
    code: string;
    /** Description of the dish */
    description: string;
    /** Ingredients of dish */
    ingredients: string;
    /** Name */
    name: string;
    /** SEO description */
    seoDescription: string;
    /** SEO keywords */
    seoKeywords: string;
    /** SEO text */
    seoText: string;
    /** SEO title */
    seoTitle: string;
    /** The amount of carbohydrates per (100g)*/
    carbohydrateAmount: number;
    /** The amount of carbohydrates in the dish */
    carbohydrateFullAmount: number;
    /** Energy value (100 g) */
    energyAmount: number;
    /** Energy value */
    energyFullAmount: number;
    /**  The amount of fat (100 g) */
    fatAmount: number;
    /** The amount of fat in the dish */
    fatFullAmount: number;
    /** The number of proteins (100g)  */
    fiberAmount: number;
    /** The amount of proteins in the dish */
    fiberFullAmount: number;
    /** The group identifier in which the dish is located
     * @deprecated will  be deleted in v2
    */
    groupId: string;
    /** Unit of measurement of goods (kg, l, pcs, port.)*/
    measureUnit: string;
    /** The price of the dish */
    price: number;
    /**  */
    productCategoryId: string;
    /** Type */
    type: string;
    /** Weight  */
    weight: number;
    /** Sorting order */
    sortOrder: number;
    /** The dish is removed */
    isDeleted: boolean;
    /** The dish can be modified*/
    isModificable: boolean;
    /** Модифакторы блюда */
    modifiers: GroupModifier[];
    /** Parental group */
    parentGroup: any;
    /** Tags for filtering (vegetarian, sharp ...) */
    tags: any;
    /** Balance for sale, if -1, then as much as you like */
    balance: number;
    /**List of images of the dish*/
    images: string[] | MediaFile[];
    /** The human easy readable */
    slug: string;
    /** The concept to which the dish belongs */
    concept: string;
    /** Wesh */
    hash: string;
    /** Can be seen on the site on the menu */
    visible: boolean;
    /** A sign that this is a modifier */
    modifier: boolean;
    /**A sign that a promotional dish */
    promo: boolean;
    /** Working hours */
    worktime: WorkTime[];
    customData: CustomData;
};
interface IVirtualFields {
    discountAmount?: number;
    discountType?: "flat" | "percentage";
    oldPrice?: number;
}
type attributes = typeof attributes;
interface Dish extends RequiredField<OptionalAll<attributes>, "name" | "price">, IVirtualFields, ORM {
}
export default Dish;
declare let Model: {
    beforeCreate: (init: Dish, cb: (err?: string) => void) => Promise<void>;
    beforeUpdate: (value: Dish, cb: (err?: string) => void) => Promise<void>;
    afterUpdate: (record: any, cb: (err?: string) => void) => void;
    afterCreate: (record: any, cb: (err?: string) => void) => void;
    /**
     * Accepts Waterline Criteria and prepares it there isdeleted = false, balance! = 0. Thus, this function allows
     * Find in the base of the dishes according to the criterion and at the same time such that you can work with them to the user.
     * @param criteria - criteria asked
     * @return Found dishes
     */
    getDishes(criteria?: any): Promise<Dish[]>;
    /**
     * Popularizes the modifiers of the dish, that is, all the Group modifiers are preparing a group and dishes that correspond to them,
     * And ordinary modifiers are preparing their dish.
     * @param dish
     */
    getDishModifiers(dish: Dish): Promise<Dish>;
    display(criteria: CriteriaQuery<Dish>): Promise<Dish[]>;
    /**
     * Checks whether the dish exists, if it does not exist, then creates a new one and returns it.If exists, then checks
     * Hesh of the existing dish and new data, if they are identical, then immediately gives the dishes, if not, it updates its data
     * for new ones
     * @param values
     * @return Updated or created dish
     */
    createOrUpdate(values: Dish): Promise<Dish>;
};
declare global {
    const Dish: typeof Model & ORMModel<Dish, "name" | "price">;
}
