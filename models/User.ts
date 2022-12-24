import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import Dish from "../models/Dish";
import Order from "../models/Order";
import UserBonusProgram from "../models/UserBonusProgram";
import { Country } from "../interfaces/Country";
import * as bcryptjs from "bcryptjs";
import { OptionalAll } from "../interfaces/toolsTS";
const Countries: Country[] = require("../libs/dictionaries/countries.json")
type Phone = {
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


  firstName: {
    type: 'string',
    required: true
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
      { 
        code: String!
        number: String!
        additionalNumber: String
      }
   */
  phone: {
    type: 'json',
    required: true,
    custom: function(phone: Phone) {
      if (!phone.code || !phone.number) return false;

      // Check dictonary
      let isCounryCode = false
      for (let country of Countries) {
        if (phone.code === country.phoneCode) isCounryCode = true;
      }

      if(typeof phone.code !== "string" || typeof phone.number !== "string" || typeof phone.number !== "string" || isCounryCode === false) return false
    }
  } as unknown as Phone,

  birthday: {
    type: 'string',
    isAfter: new Date('Sat Jan 1 1900 00:00:00 GMT-0000'),
    // isBefore: new Date().setFullYear(new Date().getFullYear()-10)
  } as unknown as string,


  passwordHash: {
    type: 'string',
    isNotEmptyString: true
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
  
  verified: {
    type: 'boolean'
  } as unknown as boolean,

  lastActive: {
    type: 'string',
    isAfter: new Date('Sat Jan 1 2023 00:00:00 GMT-0000'),
  } as unknown as string,

  lastPasswordChange: {
    type: 'string',
    isAfter: new Date('Sat Jan 1 2023 00:00:00 GMT-0000'),
  } as unknown as string,

  isDeleted: { 
    type:'boolean'
  } as unknown as boolean,
  
  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface User extends attributes, ORM {}
export default User;

let Model = {
  beforeCreate(userInit: User, next: Function) {
    if (!userInit.id) {
      userInit.id = uuid();
    }
    
    if(!userInit.isDeleted) userInit.isDeleted = false;
    if(!userInit.verified) userInit.verified = false;

    next();
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
  async setPassword(userId: string, newPassword: string, oldPassword: string, force: boolean = false): Promise<void> {
    let paswordRegex = await Settings.get("PasswordRegex");
    let passwordMinLength = await Settings.get("PasswordMinLength");
    
    if (passwordMinLength && newPassword.length <= passwordMinLength) throw `Password less than minimum length`
    if (paswordRegex && !newPassword.match(paswordRegex as string)) throw `Password not match with regex`
    
    if (!userId || !newPassword) throw 'UserId and newPassword is required'
    
    // salt
    let salt = await Settings.get("PasswordSalt");
    if (!salt) salt = "number42";
    
    if (force) {
      if (!oldPassword) throw 'oldPassword is required'  
      let user = await User.findOne({id:userId});
      let oldPasswordHash = bcryptjs.hashSync(oldPassword, salt as string | number);
      if (oldPasswordHash !== user.passwordHash) {
        throw `Old pasword not accepted`
      }
    }

    let passwordHash = bcryptjs.hashSync(newPassword, salt as string | number);
    User.update({id: userId}, {passwordHash: passwordHash, lastPasswordChange: new Date().toISOString()});
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const User: typeof Model & ORMModel<User, "id" | "firstName" >;
}
