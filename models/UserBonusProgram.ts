import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import Dish from "./Dish";
import Order from "./Order";
import User from "../models/User"

// type Optional<T> = {
//   [P in keyof T]?: T[P];
// }

let attributes = {
  
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as Readonly<string>,

  active: {
    type: 'boolean'
  },

  balance: {
    type: 'number'
  },
  
  isDeleted: {
    type: 'boolean',
  },

  user: {
    model: 'user'
  },

  BonusProgram: {
    model: 'bonusprogram'
  },

  /** UNIX era seconds */
  syncedToTime: "string",

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};




type attributes = typeof attributes;
interface UserBonusProgram extends attributes, ORM {}
export default UserBonusProgram;

let Model = {
  beforeCreate(UserBonusInit: any, next: any) {
    if (!UserBonusInit.id) {
      UserBonusInit.id = uuid();
    }
    
    next();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const UserBonusProgram: typeof Model & ORMModel<UserBonusProgram, null>;
}
