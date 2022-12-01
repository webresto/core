import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import Dish from "./Dish";
import Order from "./Order";

let attributes = {
  
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Type of bonuses */
  type: 'string',
  
  active: {
    type: 'boolean',
    defaultsTo: true
  },

  balance: {
    type: 'boolean',
    defaultsTo: true
  },
  
  isDeleted: {
    type: 'boolean',
  },

  user: {
    collection: 'user',
    via: "bonuses"
  },

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface UserBonus extends attributes, ORM {}
export default UserBonus;

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
  const UserBonus: typeof Model & ORMModel<UserBonus>;
}
