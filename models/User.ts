import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import Dish from "../models/Dish";
import Order from "../models/Order";
import UserDevice from "./UserDevice";
import UserBonusProgram from "../models/UserBonusProgram";
import { Country } from "../interfaces/Country";
import * as bcryptjs from "bcryptjs";
import { OptionalAll } from "../interfaces/toolsTS";
const Countries: Country[] = require("../libs/dictionaries/countries.json")

export type Phone = {
  code: string
  number: string 
  additionalNumber?: string 
}

let attributes = {
  
  /** ID */
  id: {
    type: "string",
    isNotEmptyString: true,
    unique: true
  } as unknown as string,

  login: {
    type: 'string',
    required: true,
    isNotEmptyString: true
  } as unknown as string,

  firstName: {
    type: 'string',
    allowNull: true,
    isNotEmptyString: true
  } as unknown as string,

  lastName: {
    type: 'string',
    allowNull: true,
    isNotEmptyString: true
  } as unknown as string,

  email: {
    type: 'string',
    isEmail: true
  } as unknown as string,
  
    /** 
     * Its a basic login field
     *  type Phone {
          code: string
          number: string
          additionalNumber?: string
        }
     */
  phone: {
    type: 'json',
    // required: true,
    custom: function(phone: Phone) {
      if (!phone.code || !phone.number) throw `Code or Number of phone not passed`;

      // Check dictonary
      let isCounryCode = false
      for (let country of Countries) {
        
        if (phone.code.replace(/\D/g, '') === country.phoneCode.replace(/\D/g, '')) isCounryCode = true;
      }

      if(typeof phone.code !== "string" || typeof phone.number !== "string" || typeof phone.number !== "string" || isCounryCode === false) {        
        return false
      }
      return true
    }
  } as unknown as Phone,

  birthday: {
    type: 'string',
    // isAfter: new Date('Sat Jan 1 1900 00:00:00 GMT-0000'),
    // isBefore: new Date().setFullYear(new Date().getFullYear()-10)
  } as unknown as string,

  favorites: {
    collection: 'dish'
  } as unknown as Dish[],

  bonusProgram: {
    collection: 'userbonusprogram',
  } as unknown as UserBonusProgram,

  history: {
    collection: 'order',
  } as unknown as Order[],

  locations: {
    collection: 'UserLocation',
    via: 'user'
  },

  devices: {
    collection: 'UserDevice',
    via: 'user'
  },
  
  /**
   *  Has success verification Phone
   */
  isPhoneVerified: {
    type: 'boolean'
  } as unknown as boolean,

  /**
   * Indicate filled all required custom fields 
   */
  hasFilledAllCustomFields: {
    type: 'boolean'
  } as unknown as boolean,

  passwordHash: {
    type: 'string',
    allowNull: true,
    isNotEmptyString: true
  } as unknown as string,

  lastPasswordChange:  { type: "number"} as unknown as number,

  /** Its temporary code for authorization */
  temporaryCode: {
    type: 'string',
    allowNull: true
  } as unknown as string,

  /**
   * UserGroup (new, best.... ) 
   * Its Idea for making different promo for users   
   */
  // group:  "string",

  /** Mark as kitchen worker 
   * its idea for making delivery message for Employers
   * */
  // isEmployee: { 
  //   type:'boolean'
  // } as unknown as boolean,

  isDeleted: { 
    type:'boolean'
  } as unknown as boolean,
  
  /** 
   * Object with filed custom user fields
  */
  customFields: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,

  /** 
  * Any data storadge for person
  */
  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface User extends OptionalAll<attributes>, ORM {}
export default User;

let Model = {
  async beforeCreate(userInit: User, next: Function) {
    if (!userInit.id) {
      userInit.id = uuid();
    }

    if (!userInit.isDeleted) userInit.isDeleted = false;
    if (!userInit.verified) userInit.verified = false;

    if ((await Settings.get("LOGIN_FIELD")) === undefined || (await Settings.get("LOGIN_FIELD")) === "phone") {
      if (!userInit.phone) throw `User phone is required`;
    }

    next();
  },

  /**
   * Returns phone string by user criteria
   * Additional number will be added separated by commas (+19990000000,1234)
   * @param {WaterlineCriteria} criteria
   * @returns String
   */
  async getPhoneString(phone: Phone, target: "login" | "print" | "string" = "login") {
    if (target === "login") {
      return (phone.code + phone.number).replace(/\D/g, "");
    } else if (target === "print") {
      // TODO: implement mask `+1 (111) 123-45-67`
      // GPT: return `+${phone.code} (${phone.number.slice(0,3)}) ${phone.number.slice(3,6)}-${phone.number.slice(6,8)}-${phone.number.slice(8)}`
    } else {
      return `${phone.code}${phone.number}${phone.additionalNumber ? "," + phone.additionalNumber : ""}`;
    }
  },

  /**
   * Update user password
   *
   * @param userId User id
   * @param newPassword New password
   * @param oldPassword Old Password
   * @param force Skip check old password
   *
   *
   * @setting PasswordSalt - Password salt (default: number42)
   * @setting PasswordRegex - Checking password by regex (default: no check)
   * @setting PasswordMinLength - Checks minimum length password (default: no check)
   *
   * Note: node -e "console.log(require('bcryptjs').hashSync(process.argv[1], "number42"));" your-password-here
   */
  async setPassword(userId: string, newPassword: string, oldPassword: string, force: boolean = false, temporaryCode?: string): Promise<User> {
    if (!userId || !newPassword) throw "UserId and newPassword is required";

    if (!(await Settings.get("SET_LAST_OTP_AS_PASSWORD"))) {
      let paswordRegex = await Settings.get("PASSWORD_REGEX");
      let passwordMinLength = await Settings.get("PASSWORD_MIN_LENGTH");

      if (Number(passwordMinLength) && newPassword.length < Number(passwordMinLength)) throw `Password less than minimum length`;
      if (paswordRegex && !newPassword.match(paswordRegex as string)) throw `Password not match with regex`;
    }

    // salt
    let salt = await Settings.get("PasswordSalt");
    if (!salt) salt = 8;

    let user = await User.findOne({ id: userId });

    /**
     * If not force, it should check new/old paswords
     * If user not have oldPassword
     */
    if (!force) {
      if (user.passwordHash) {
        if (!oldPassword) throw "oldPassword is required";
        if (!(await bcryptjs.compare(oldPassword, user.passwordHash))) {
          throw `Old pasword not accepted`;
        }
      } else if (temporaryCode) {
        let login = await User.getPhoneString(user.phone);

        if (!(await OneTimePassword.check(login, temporaryCode))) {
          throw `Temporary code not match`;
        }
      }
    }

    let passwordHash = bcryptjs.hashSync(newPassword, salt as string | number);
    return await User.updateOne({ id: user.id }, { passwordHash: passwordHash, lastPasswordChange: Date.now() });
  },

  async login(login: string, deviceId: string, deviceName: string, password: string, OTP: string, userAgent: string, IP: string): Promise<UserDevice> {
    let user = await User.findOne({ login: login });

    // Stop login without deviceName
    if (!deviceName && !deviceId) {
      throw `deviceName && deviceId required`;
    }



    // Stop login when password or OTP not passed
    if (!(password || OTP)) {
      throw `Password or OTP required`;
    }


    // Check OTP first because it will prevent brute force.
    if (OTP || (await Settings.get("LOGIN_OTP_REQUIRED"))) {
      if (!(await OneTimePassword.check(login, OTP))) {
        throw "OTP check failed";
      }
    }

    // check password if passed or required
    if (password || (await Settings.get("PASSWORD_REQUIRED"))) {
      if (!(await bcryptjs.compare(password, user.passwordHash))) {
        throw `Password not match`;
      }
    }

    // Set last checked OTP as password
    if ((await Settings.get("LOGIN_OTP_REQUIRED")) && (await Settings.get("SET_LAST_OTP_AS_PASSWORD"))) {
      await User.setPassword(user.id, OTP, null, true);
    }
    return await User.authDevice(user.id, deviceId, deviceName, userAgent, IP);
  },


  async authDevice(userId: string, deviceId: string,  deviceName: string, userAgent: string, IP: string): Promise<UserDevice> {
    let userDevice = await UserDevice.findOrCreate({id: deviceId }, {id: deviceId, user: userId, name: deviceName });
    // Need pass sessionId here for except paralells login with one name
    return await UserDevice.updateOne({ id: userDevice.id }, { loginTime: Date.now(), isLogined: true, lastIP: IP, userAgent: userAgent, sessionId: uuid() });
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const User: typeof Model & ORMModel<User, null >;
}
"firstName"