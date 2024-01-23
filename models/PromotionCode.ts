import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import Promotion from "./Promotion";
import { WorkTime } from "@webresto/worktime/lib/worktime.validator";
let attributes = {

  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Id in external system */
  externalId: {
    type: "string",
    allowNull: true
  } as unknown as string,
  
  /** Not Generated */
  type: { 
    type:'string',
    /**
    static - just one promocode 
    generated - uses promocodeGeneratorAdapter TODO: see test/experiments dir
    serial - maybe pregenrated, need store
    external - connect to external system (bad way becose need make request)
     * */ 

    isIn: ['static', 
    // 'generated', 'serial', 'external'
    ]
  } as unknown as string,

  /** base for PromotionCode */
  prefix: {
    type: "string",
    allowNull: true
  } as unknown as string,

  startDate: "string",
  stopDate: "string",
  workTime: "json" as unknown as WorkTime,
  
  description: {
    type: "string",
    required: true,
  } as unknown as string,

  code: {
    type: "string",
    allowNull: true
  } as unknown as string,
 
  // TODO: Add interval to allow for use again
  promotion: {
    collection: "promotion",
    via: "promotionCode",
  } as unknown as Promotion[] | string,

  generateConfig: {
    type: "json",
  } as unknown as any,

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface PromotionCode extends attributes, ORM {}
export default PromotionCode;

let Model = {
  beforeCreate(promotionCodeInit: any, cb:  (err?: string) => void) {
    if (!promotionCodeInit.id) {
      promotionCodeInit.id = uuid();
    }
    
    cb();
  },

  /**
   * Check promocode is work now
   */
  async getValidPromotionCode(promotionCodeString: string): Promise<PromotionCode> {
    return await PromotionCode.findOne({code: promotionCodeString})
    //return null
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  /**
   * Promotion by code
   */
  const PromotionCode: typeof Model & ORMModel<PromotionCode, null>;
}
