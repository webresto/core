import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { RequiredField, OptionalAll } from "../interfaces/toolsTS";

let attributes = {
  
  /** ID */
  id: {
    type: "number",
    autoIncrement: true,
  } as unknown as number,

  /**
   * relation by CORE_LOGIN_FIELD setting
   */
  login: {
    type: 'string',
    required: true
  } as unknown as string,
  password: 'string',
  expires: 'number' as unknown as number
};

type attributes = typeof attributes;

/**
 * @deprecated use `OneTimePasswordRecord` instead
 */
interface OneTimePassword extends RequiredField<OptionalAll<attributes>, "login" >, ORM {}
export interface OneTimePasswordRecord extends RequiredField<OptionalAll<attributes>, "login" >, ORM {}


let Model = {
  beforeCreate(record: OneTimePasswordRecord, cb:  (err?: string) => void) {
    if (!record.password) {
      record.password = generateOtp();
    }

    if (!record.expires) {
      record.expires = Date.now() + 30 * 60 * 1000 // 30 minutes
    }
    cb();
  },

  async check(login: string, password: string): Promise<boolean> {
    // Clean expired
    await OneTimePassword.destroy({expires: { "<": Date.now() }}).fetch()
    
    if(process.env.NODE_ENV !== "production" && process.env.DEFAULT_OTP === password) {
      return true
    }
    
    let OTP = (await OneTimePassword.find({login: login}).sort('createdAt DESC'))[0]
    if (OTP === undefined) return false
    if (password === OTP.password) {
      await OneTimePassword.destroy({id: OTP.id})
      return true
    }
    
    return false
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const OneTimePassword: typeof Model & ORMModel<OneTimePasswordRecord,  "login" >;
}


function generateOtp() {
  if (process.env.NODE_ENV !== "production" && process.env.DEFAULT_OTP){
    return process.env.DEFAULT_OTP;
  }
  
  let digits = '1234567890';
  let otp = ''
  for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}
