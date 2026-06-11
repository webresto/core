import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { NotificationService } from "../libs/NotificationService";

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

  /**
   * Typed notification event for the notifications pipeline. Universal point covering
   * every OTP adapter (they all persist through this model). Detached: a notification
   * problem must not break OTP issuing. The legacy NotificationManager send in the OTP
   * adapter stays as-is until operators migrate to a notification rule for this event.
   * Note: with DEMO_OTP_LOGIN the password may be overridden after create — the demo
   * code then differs from the emitted one; demo-only, acceptable.
   */
  afterCreate(record: OneTimePasswordRecord, cb: (err?: string) => void) {
    void (async () => {
      try {
        const user = await User.findOne({ login: record.login });
        const ttlSec = Math.max(0, Math.round((Number(record.expires || 0) - Date.now()) / 1000));
        await NotificationService.emit("user_otp_requested", {
          recipient: user ? { userId: user.id, user } : {},
          context: {
            user: user
              ? {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  phone: user.phone ? `${(user.phone as any).code || ""}${(user.phone as any).number || ""}` : record.login,
                  email: (user as any).email,
                }
              : { phone: record.login },
            otp: { code: record.password, ttlSec },
          },
          // OTP is always user-facing even when the login has no User record yet;
          // phone-capable channels take the number from context.user.phone.
          groupTo: "user",
          meta: { sourceModule: "core/otp", idempotencyKey: `user_otp:${record.id}` },
        });
      } catch (error) {
        sails.log.error(`OneTimePassword > user_otp_requested emit failed for login ${record.login}`, error);
      }
    })();
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
  if((process.env.DEMO_MODE || "").toLowerCase() === "true") {
    return "999999";
  }
  
  if (process.env.NODE_ENV !== "production" && process.env.DEFAULT_OTP) {
    return process.env.DEFAULT_OTP;
  }
  
  let digits = '1234567890';
  let otp = ''
  for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}
