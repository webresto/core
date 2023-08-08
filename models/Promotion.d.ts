import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { IconfigDiscount } from "../interfaces/ConfigDiscount";
declare let attributes: {
    id: string;
    externalId: string;
    configDiscount: IconfigDiscount;
    /** created by User */
    createdByUser: boolean;
    name: string;
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
    /** No active class in Discount Adapter */
    isDeleted: boolean;
    /** Хеш обекта скидки */
    hash: string;
    worktime: WorkTime[];
};
type attributes = typeof attributes;
interface Promotion extends RequiredField<OptionalAll<attributes>, "id" | "configDiscount" | "isJoint" | "name" | "isPublic" | "description" | "concept" | "enable" | "isDeleted" | "createdByUser" | "externalId">, ORM {
}
export default Promotion;
declare let Model: {
    afterUpdate(record: Promotion, next: Function): Promise<void>;
    afterCreate(record: Promotion, next: Function): Promise<void>;
    beforeUpdate(init: Promotion, next: Function): Promise<void>;
    beforeCreate(init: Promotion, next: Function): Promise<void>;
    createOrUpdate(values: Promotion): Promise<Promotion>;
    getAllByConcept(concept: string[]): Promise<Promotion[]>;
    setAlive(idArray: string[]): Promise<void>;
};
declare global {
    const Promotion: typeof Model & ORMModel<Promotion, "concept">;
}
