import { MediaFileRecord } from "./MediaFile";
import { CriteriaQuery, ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { WorkTime } from "@webresto/worktime";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { GroupModifier } from "../interfaces/Modifier";
import { CustomData } from "../interfaces/CustomData";
import { UserRecord } from "./User";
import { GroupRecord } from "./Group";
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
    /** Ingredients of a dish */
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
    /** The number of carbohydrates per (100g)*/
    carbohydrateAmount: number;
    /**
     * @deprecated
     * The number of carbohydrates in the dish */
    carbohydrateFullAmount: number;
    /** Energy value (100 g) */
    energyAmount: number;
    /**
     * @deprecated
     * Energy value */
    energyFullAmount: number;
    /**  The amount of fat (100 g) */
    fatAmount: number;
    /**
     * @deprecated
     * The amount of fat in the dish */
    fatFullAmount: number;
    /**
     * The number of fiber (100g)  */
    fiberAmount: number;
    /**
     * @deprecated
     * The number of proteins in the dish */
    fiberFullAmount: number;
    /** The number of proteins (100g)  */
    proteinAmount: number;
    /**
     * @deprecated
     * The number of proteins in the dish */
    proteinFullAmount: number;
    /** The group identifier in which the dish is located
     * @deprecated will be deleted in v2
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
    /** Parental group */
    parentGroup: GroupRecord | any;
    /** Tags for filtering (vegetarian, sharp ...) */
    tags: any;
    /** Balance for sale, if -1, then as much as you like */
    balance: number;
    /** The human easy readable */
    slug: string;
    /** The concept to which the dish belongs */
    concept: string;
    /** Hash */
    hash: string;
    /** Can be seen on the site on the menu */
    visible: boolean;
    /** A sign that this is a modifier */
    modifier: boolean;
    /**A sign that a promotional dish */
    promo: boolean;
    /** Working hours */
    worktime: WorkTime[];
    /** Модифакторы блюда */
    modifiers: GroupModifier[];
    /**List of images of the dish*/
    images: MediaFileRecord[];
    favorites: UserRecord[];
    recommendations: DishRecord[];
    recommendedBy: DishRecord[];
    customData: CustomData;
};
interface IVirtualFields {
    discountAmount?: number;
    discountType?: "flat" | "percentage";
    /**
     * @deprecated change to oldPrice
     */
    oldPrice?: number;
    salePrice?: number;
}
type attributes = typeof attributes;
export interface DishRecord extends RequiredField<OptionalAll<attributes>, "name" | "price">, IVirtualFields, ORM {
}
declare let Model: {
    beforeCreate: (init: DishRecord, cb: (err?: string) => void) => Promise<void>;
    beforeUpdate: (value: DishRecord, cb: (err?: string) => void) => Promise<void>;
    afterUpdate: (record: any, cb: (err?: string) => void) => void;
    afterCreate: (record: any, cb: (err?: string) => void) => void;
    /**
     * Accepts Waterline Criteria and prepares it there isDeleted = false, balance! = 0. Thus, this function allows
     *  finding in the base of the dishes according to the criterion and at the same time such that you can work with them to the user.
     * @param criteria - criteria asked
     * @return Found dishes
     */
    getDishes(criteria?: any): Promise<DishRecord[]>;
    /**
     * Popularizes the modifiers of the dish, that is, all the Group modifiers are preparing a group and dishes that correspond to them,
     * And ordinary modifiers are preparing their dish.
     * @param dish
     */
    getDishModifiers(dish: DishRecord): Promise<DishRecord>;
    display(criteria: CriteriaQuery<DishRecord>): Promise<DishRecord[]>;
    getRecommended: (ids: string[], limit?: number, includeReverse?: boolean) => Promise<DishRecord[]>;
    /**
     * Checks whether the dish exists, if it does not exist, then creates a new one and returns it.If exists, then checks
     * Hash of the existing dish and new data, if they are identical, then immediately gives the dishes, if not, it updates its data
     * for new ones
     * @param values
     * @return Updated or created dish
     */
    createOrUpdate(values: DishRecord): Promise<DishRecord>;
};
declare global {
    const Dish: typeof Model & ORMModel<DishRecord, "name" | "price">;
}
export {};
