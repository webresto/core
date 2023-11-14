import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { IconfigDiscount } from "../interfaces/ConfigDiscount";
import PromotionCode from "../models/PromotionCode";
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
    /** User can disable this discount*/
    enable: boolean;
    promotionCode: PromotionCode[];
    /** No active class in Discount Adapter */
    isDeleted: boolean;
    /** Хеш обекта скидки */
    hash: string;
    worktime: WorkTime[];
};
type attributes = typeof attributes;
interface Promotion extends RequiredField<OptionalAll<attributes>, "id" | "configDiscount" | "isJoint" | "name" | "isPublic" | "description" | "concept" | "badge" | "isDeleted" | "createdByUser" | "externalId">, ORM {
}
export default Promotion;
declare let Model: {
    afterUpdate(record: Promotion, cb: (err?: string) => void): Promise<void>;
    afterCreate(record: Promotion, cb: (err?: string) => void): Promise<void>;
    afterDestroy(record: Promotion, cb: (err?: string) => void): Promise<void>;
    beforeUpdate(init: Promotion, cb: (err?: string) => void): void;
    beforeCreate(init: Promotion, cb: (err?: string) => void): Promise<void>;
    createOrUpdate(values: Promotion): Promise<Promotion>;
    getAllByConcept(concept: string[]): Promotion[];
};
declare global {
    const Promotion: typeof Model & ORMModel<Promotion, "concept">;
}
