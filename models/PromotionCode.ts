import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import { PromotionRecord } from "./Promotion";
import { WorkTime } from "@webresto/worktime/lib/worktime.validator";

function normalizePromotionCodeValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  return normalized || null;
}

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
    serial - maybe pre-generated, need store
    external - connect to external system (bad way because need make request)
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

  /** Whether customers can apply this promo code. */
  enable: {
    type: "boolean",
    defaultsTo: true,
  } as unknown as boolean,

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
    via: "promotionCode"
  } as unknown as PromotionRecord[] | string[],

  generateConfig: {
    type: "json",
  } as unknown as any,

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
/**
 * @deprecated use `PromotionCodeRecord` instead
 */
interface PromotionCode extends attributes, ORM {}
export interface PromotionCodeRecord extends attributes, ORM {}

let Model = {
  beforeCreate(promotionCodeInit: PromotionCodeRecord, cb:  (err?: string) => void) {
    if (!promotionCodeInit.id) {
      promotionCodeInit.id = uuid();
    }

    promotionCodeInit.code = normalizePromotionCodeValue(promotionCodeInit.code);
    promotionCodeInit.prefix = normalizePromotionCodeValue(promotionCodeInit.prefix);

    cb();
  },

  beforeUpdate(values: Partial<PromotionCodeRecord>, cb: (err?: string) => void) {
    if (Object.prototype.hasOwnProperty.call(values, "code")) {
      values.code = normalizePromotionCodeValue(values.code);
    }

    if (Object.prototype.hasOwnProperty.call(values, "prefix")) {
      values.prefix = normalizePromotionCodeValue(values.prefix);
    }

    cb();
  },

  /**
   * Check promocode is work now
   */
  async getValidPromotionCode(promotionCodeString: string): Promise<PromotionCodeRecord | null> {
    const normalizedCode = normalizePromotionCodeValue(promotionCodeString);
    if (!normalizedCode) {
      return null;
    }

    // `enable` was added after promo codes already existed. Treat records without
    // the flag as enabled so a deploy does not silently disable existing codes.
    const promotionCode = await PromotionCode.findOne({code: normalizedCode}).populate("promotion");
    return promotionCode?.enable === false ? null : promotionCode;
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
  const PromotionCode: typeof Model & ORMModel<PromotionCodeRecord, null>;
}
