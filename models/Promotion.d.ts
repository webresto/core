import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { IconfigDiscount } from "../interfaces/ConfigDiscount";
import { PromotionCodeRecord } from "./PromotionCode";
declare let attributes: {
    id: string;
    externalId: string;
    configDiscount: IconfigDiscount;
    /** created by User */
    createdByUser: boolean;
    name: string;
    badge: string;
    concept: string[];
    sortOrder: number;
    description: string;
    /** is available by API for customer only for display */
    isPublic: boolean;
    /** first use isJoint = false discounts then true */
    isJoint: boolean;
    productCategoryPromotions: any;
    /**
     * User can disable this discount
     * By default is disabled
     * promocode ignore this field, and apply promotion by code
    */
    enable: boolean;
    promotionCode: PromotionCodeRecord[] | string[];
    /** No active class in Discount Adapter */
    isDeleted: boolean;
    /** Hash object discounts */
    hash: string;
    worktime: WorkTime[];
};
type attributes = typeof attributes;
/**
 * @deprecated use `PromotionRecord` instead
 */
interface Promotion extends RequiredField<OptionalAll<attributes>, "id" | "configDiscount" | "isJoint" | "name" | "isPublic" | "description" | "concept" | "badge" | "isDeleted" | "createdByUser" | "externalId">, ORM {
}
export interface PromotionRecord extends RequiredField<OptionalAll<attributes>, "id" | "configDiscount" | "isJoint" | "name" | "isPublic" | "description" | "concept" | "badge" | "isDeleted" | "createdByUser" | "externalId">, ORM {
}
declare let Model: {
    afterUpdate(record: PromotionRecord, cb: (err?: string) => void): any;
    afterCreate(record: PromotionRecord, cb: (err?: string) => void): any;
    afterDestroy(record: PromotionRecord, cb: (err?: string) => void): any;
    beforeUpdate(init: Promotion, cb: (err?: string) => void): void;
    beforeCreate(init: Promotion, cb: (err?: string) => void): any;
    createOrUpdate(values: Promotion): Promise<PromotionRecord>;
    getAllByConcept(concept: string[]): PromotionRecord[];
};
declare global {
    const Promotion: typeof Model & ORMModel<PromotionRecord, "concept">;
}
export {};
