import { MediaFileRecord } from "./MediaFile";
import { CriteriaQuery, ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { WorkTime } from "@webresto/worktime";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { GroupModifier } from "../interfaces/Modifier";
import { CustomData } from "../interfaces/CustomData";
import { UserRecord } from "./User";
import { GroupRecord } from "./Group";
import { MenuContext } from "../interfaces/Menu";
/** Canonical business types for a catalog product. `Dish` remains the Sails model during migration. */
export type ProductType = "dish" | "product" | "service";
export declare const PRODUCT_TYPES: readonly ProductType[];
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
    /** The number of carbohydrates in the dish */
    carbohydrateFullAmount: number;
    /** Energy value (100 g) */
    energyAmount: number;
    /** Energy value of the dish */
    energyFullAmount: number;
    /**  The amount of fat (100 g) */
    fatAmount: number;
    /** The amount of fat in the dish */
    fatFullAmount: number;
    /**
     * The number of fiber (100g)  */
    fiberAmount: number;
    /** The number of fiber in the dish */
    fiberFullAmount: number;
    /** The number of proteins (100g)  */
    proteinAmount: number;
    /** The number of proteins in the dish */
    proteinFullAmount: number;
    /** Unit of measurement of goods (kg, l, pcs, port.)*/
    measureUnit: string;
    /** The price of the dish */
    price: number;
    /**  */
    productCategoryId: string;
    /** Catalog product type. An integration that omits it gets `dish`. */
    type: ProductType;
    /**
     * How long the kitchen needs for this product, in minutes.
     *
     * One number, not a range. A range was two columns an operator had to fill in
     * twice to say one thing, and it turned the promise into "40–40" whenever they
     * did. Stays `null` until somebody fills it in — a default here would put an
     * invented figure into a promise made to a customer.
     *
     * Only read for `type: "dish"`. A bottle of water is not cooked, and letting
     * it carry a preparation time would mean a basket of drinks quotes one.
     */
    cookingTimeMax: number;
    /** Weight  */
    weight: number;
    /** Sorting order */
    sortOrder: number;
    /** Soft deletion flag. Indicates the item has been removed from the external RMS system. */
    isDeleted: boolean;
    /** System status flag. When false, the item is completely disabled for ordering. Managed manually by administrators and not overwritten by RMS synchronization. */
    enable: boolean;
    /** The dish can be modified*/
    isModificable: boolean;
    /** Parental group */
    parentGroup: GroupRecord | any;
    /** Tags for filtering (vegetarian, sharp ...) */
    tags: any;
    /** The human easy readable */
    slug: string;
    /** The concept to which the dish belongs */
    concept: string;
    /** Hash */
    hash: string;
    /** Visibility status sent to the frontend. The server does not filter by this field, allowing the client application to handle visibility logic. */
    visible: boolean;
    /** A sign that this is a modifier */
    modifier: boolean;
    /**A sign that a promotional dish */
    promo: boolean;
    /**A sign that a promotional dish */
    notForSale: boolean;
    /** Working hours */
    worktime: WorkTime[];
    /** Dish modifiers */
    modifiers: GroupModifier[];
    /**List of images of the dish*/
    images: MediaFileRecord[];
    favorites: UserRecord[];
    recommendations: DishRecord[];
    recommendedBy: DishRecord[];
    recommendedForGroup: GroupRecord[];
    customData: CustomData;
};
interface IVirtualFields {
    discountAmount?: number;
    discountType?: "flat" | "percentage";
    salePrice?: number;
}
type attributes = typeof attributes;
export interface DishRecord extends RequiredField<OptionalAll<attributes>, "name" | "price">, IVirtualFields, ORM {
}
declare let Model: {
    beforeCreate: (init: DishRecord, cb: (err?: string) => void) => Promise<void>;
    beforeUpdate: (value: DishRecord, cb: (err?: string) => void) => Promise<void>;
    afterUpdate: (record: DishRecord, cb: (err?: string) => void) => void;
    afterCreate: (record: DishRecord, cb: (err?: string) => void) => void;
    /**
     * Accepts Waterline Criteria and prepares it there isDeleted = false. Thus, this function allows
     *  finding in the base of the dishes according to the criterion and at the same time such that you can work with them to the user.
     *
     * Stock is no longer a column of this model, so it cannot be part of the
     * criteria: it belongs to the pair "product + cooking point". Products that
     * are stopped at the point are dropped after the query instead, by the menu
     * adapter — which mode is in force decides what "stopped" narrows to.
     * @param criteria - criteria asked
     * @param context - the menu context, resolved by the caller: `Group.getGroups`
     *   once for a whole menu, so one menu is never built out of two
     * @return Found dishes
     */
    getDishes(criteria: any, context: MenuContext): Promise<DishRecord[]>;
    /**
     * Popularizes the modifiers of the dish, that is, all the Group modifiers are preparing a group and dishes that correspond to them,
     * And ordinary modifiers are preparing their dish.
     * @param dish
     * @param context - the menu context the dish is read in; a modifier's stock is
     *   read at the same points as the dish's, union included
     */
    getDishModifiers(dish: DishRecord, context: MenuContext): Promise<DishRecord>;
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
