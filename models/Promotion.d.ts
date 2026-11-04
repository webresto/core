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
     * "Works": whether the promotion applies at all. Switched off, it applies nowhere - neither by itself nor through
     * a promo code (C22, `marketing.plan.md`). On creation - `PROMOTION_ENABLE_BY_DEFAULT`.
     *
     * It used to mean "applies by itself", and a code applied a switched-off promotion all the same. That is what
     * `onlyByCode` means now; the migration of C22 moved the records that relied on the old meaning.
     */
    enable: boolean;
    /**
     * "Only by promo code": the promotion applies through its codes and never by itself, and the storefront does not
     * show it on a dish or a group (it is out of `promotionRAM`, which is what `getAllByConcept` answers from).
     */
    onlyByCode: boolean;
    promotionCode: PromotionCodeRecord[] | string[];
    /** No active class in Discount Adapter */
    isDeleted: boolean;
    /** Hash object discounts */
    hash: string;
    worktime: WorkTime[];
};
type attributes = typeof attributes;
export interface PromotionRecord extends RequiredField<OptionalAll<attributes>, "id" | "configDiscount" | "isJoint" | "name" | "isPublic" | "description" | "concept" | "badge" | "isDeleted" | "createdByUser" | "externalId">, ORM {
}
declare let Model: {
    afterUpdate(record: PromotionRecord, cb: (err?: string) => void): Promise<void>;
    afterCreate(record: PromotionRecord, cb: (err?: string) => void): Promise<void>;
    afterDestroy(record: PromotionRecord, cb: (err?: string) => void): Promise<void>;
    beforeUpdate(init: PromotionRecord, cb: (err?: string) => void): void;
    beforeCreate(init: PromotionRecord, cb: (err?: string) => void): Promise<void>;
    createOrUpdate(values: PromotionRecord): Promise<PromotionRecord>;
    /**
     * A gift dish must be `notForSale` (free gift) or `promo` (special price): the guest
     * can't add such a dish himself, so his row never merges with the gift row in addDish.
     * Returns the error message, or null when the gift config is fine.
     */
    validateGift(configDiscount: IconfigDiscount): Promise<string | null>;
    /** The promotions that apply by themselves for these concepts: `promotionRAM`, which "only by code" is out of. */
    getAllByConcept(concept: string[]): PromotionRecord[];
};
declare global {
    const Promotion: typeof Model & ORMModel<PromotionRecord, "concept">;
}
export {};
