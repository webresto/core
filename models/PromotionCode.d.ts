import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { WorkTime } from "@webresto/worktime/lib/worktime.validator";
declare let attributes: {
    /** ID */
    id: string;
    /** Id in external system */
    externalId: string;
    /** Not Generated */
    type: string;
    /** base for PromotionCode */
    prefix: string;
    startDate: string;
    stopDate: string;
    workTime: WorkTime;
    description: string;
    code: string;
    promotion: string[] | Promotion[];
    generateConfig: any;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
export interface PromotionCodeRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(promotionCodeInit: PromotionCodeRecord, cb: (err?: string) => void): void;
    /**
     * Check promocode is work now
     */
    getValidPromotionCode(promotionCodeString: string): Promise<PromotionCodeRecord>;
};
declare global {
    /**
     * Promotion by code
     */
    const PromotionCode: typeof Model & ORMModel<PromotionCodeRecord, null>;
}
export {};
