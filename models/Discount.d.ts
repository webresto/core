import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import AbstractDiscount from "../adapters/discount/AbstractDiscount";
declare let attributes: {
    /** TODO: show discounts to dish and orders */
    /** TODO: isJoint global variable for all discounts*/
    /** TODO: worktime rework */
    /** */
    id: string;
    /** TODO: implement interface
     *  discountType: 'string',
     *  discountAmount: "number",
     *
     */
    configDiscount: any;
    /** created by User */
    createdByUser: boolean;
    name: string;
    concept: string[];
    discount: string;
    discountType: string;
    actions: string;
    sortOrder: number;
    description: string;
    /** is available by API for customer*/
    isPublic: boolean;
    /** first use isJoint = false discounts then true */
    isJoint: boolean;
    productCategoryDiscounts: any;
    /** User can disable this discount*/
    enable: boolean;
    /** No active class in Discount Adapter */
    isDeleted: boolean;
    /** Хеш обекта скидки */
    hash: string;
    worktime: WorkTime[];
};
type attributes = typeof attributes;
interface Discount extends RequiredField<OptionalAll<attributes>, "id" | "configDiscount" | "isJoint" | "name" | "isPublic" | "description" | "concept" | "discount" | "discountType" | "actions" | "enable" | "isDeleted" | "sortOrder" | "productCategoryDiscounts" | "hash">, ORM {
}
export default Discount;
declare let Model: {
    afterUpdate(record: Discount, next: Function): Promise<void>;
    afterCreate(record: Discount, next: Function): Promise<void>;
    beforeUpdate(init: Discount, next: Function): Promise<void>;
    beforeCreate(init: Discount, next: Function): Promise<void>;
    createOrUpdate(values: AbstractDiscount): Promise<AbstractDiscount>;
    getAllByConcept(concept: string[]): Promise<Discount[]>;
    setDelete(): Promise<void>;
    setAlive(idArray: string[]): Promise<void>;
};
declare global {
    const Discount: typeof Model & ORMModel<Discount, "configDiscount">;
}
