import ORM from "../interfaces/ORM";

import {RequiredField, OptionalAll} from "../interfaces/toolsTS";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import User from "../models/User"


enum BonusTransactionType{
  CAME ='came',
  GONE ='gone'
}

let attributes = {
  
  /** ID */
  id: {
    type: "string",
    required: true,
  } as unknown as string,

  
  /** Type of bonuses 
  * came is incoming (positive transaction)
  * gone is outgoin (negative transaction)
  */
  type: {
    type: 'string',
    isIn: ['came', 'gone']
  } as unknown as BonusTransactionType,

  /** Custom badges */
  group: "string",

  /**
   * binary sign of transaction type
   */
  isPositive: {
    type: 'boolean',
    required: true
  } as unknown as boolean,

  amount: {
    type: 'number',
  }  as unknown as number,

  balanceAfter: {
    type: 'number',
  } as unknown as number,
  
  isDeleted: {
    type: 'boolean',
  } as unknown as boolean,

  user: {
    model: 'user'
  }  as unknown as User,

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};



type attributes = typeof attributes ;



interface UserBonusTransaction extends RequiredField<OptionalAll<attributes>, "id">, ORM {}
export default UserBonusTransaction;

let Model = {
  beforeCreate(UserBonusTransactionInit: any, next: any) {
    if (!UserBonusTransactionInit.id) {
      UserBonusTransactionInit.id = uuid();
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
  const UserBonusTransaction: typeof Model & ORMModel<UserBonusTransaction>;
}
