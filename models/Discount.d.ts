import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import Order from "./Order";
import AbstractDiscount from "../adapters/discount/AbstractDiscount";
declare let attributes: {
    /** TODO: show discounts to dish and orders */
    /** TODO: isJoint global variable for all discounts*/
    /** */
    id: string;
    /** TODO: implement interface
     *  discountType: 'string',
     *  discountAmount: "number",
     *
     */
    configuredDiscount: any;
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
    /** created by User */
    isConfigured: boolean;
    productCategoryDiscounts: any;
    /** User can disable this discount*/
    enable: boolean;
    /** No active class in Discount Adapter */
    isDeleted: boolean;
    /** Хеш обекта скидки */
    hash: string;
    worktime: WorkTime;
    startDate: string;
    stopDate: string;
    condition: (order: Order) => Promise<boolean>;
    action: () => Promise<void>;
};
type attributes = typeof attributes;
interface Discount extends RequiredField<OptionalAll<attributes>, "id" | "configuredDiscount" | "isJoint" | "name" | "isPublic" | "description" | "concept" | "discount" | "discountType" | "actions" | "condition" | "action">, ORM {
}
export default Discount;
declare let Model: {
    getAll(): Promise<Discount[]>;
    getAllByConcept(concept: string[]): Promise<Discount[]>;
    getById(discountId: string): Promise<Discount>;
    deleteById(discountId: string): Promise<void>;
    switchEnableById(discountId: string): Promise<void>;
    createOrUpdate(values: AbstractDiscount): Promise<AbstractDiscount>;
    setDelete(): Promise<void>;
    setAlive(idArray: string[]): Promise<void>;
    getActiveDiscount: () => Promise<Discount>;
};
declare global {
    const Discount: typeof Model & ORMModel<Discount, "configuredDiscount">;
}
