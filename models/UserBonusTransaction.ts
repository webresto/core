import ORM from "../interfaces/ORM";

import {RequiredField, OptionalAll} from "../interfaces/toolsTS";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import User from "../models/User"
import BonusProgram from "../models/BonusProgram"
import Decimal from "decimal.js";



let attributes = {
  
  /** ID */
  id: {
    type: "string",
    required: true,
  } as unknown as string,

  
  /** Type of bonuses (default: true)
  * came is incoming (positive transaction)
  * gone is outgoin (negative transaction)
  */
  isNegative: "boolean" as unknown as boolean,

  /** Custom badges */
  group: "string",

  amount: {
    type: 'number',
  }  as unknown as number,

  /** automatic recalculate */
  balanceAfter: {
    type: 'number',
  } as unknown as number,
  
  /** User can delete transaction */
  isDeleted: {
    type: 'boolean',
  } as unknown as boolean,

  /**
   * Indicates whether the call was made after creation. If so, this means that the bonus adapter worked without errors
   */
  isStable: {
    type: 'boolean',
  } as unknown as boolean,

  bonusProgram: {
    model: 'bonusprogram',
    required: true
  }  as unknown as BonusProgram | string,


  user: {
    model: 'user',
    required: true
  }  as unknown as User | string,

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};



type attributes = typeof attributes ;



interface UserBonusTransaction extends RequiredField<OptionalAll<attributes>, "id" | "isNegative" | "bonusProgram" | "user">, ORM {}
export default UserBonusTransaction;

let Model = {
  async beforeCreate(init: UserBonusTransaction, next: any) {
    
    // set negative by default
    if (init.isNegative === undefined) {
      init.isNegative = true;
      init.isStable = false;
    }

    // If Bonus program not active, should stop
    let bonusProgram = await BonusProgram.findOne({id: init.bonusProgram as string});

    const bonusProgramAdapterExist = await BonusProgram.isAlived(bonusProgram.id);

    // Check user balance
    if (bonusProgramAdapterExist && init.isNegative && init.user !== undefined &&  typeof init.user === "string") {
      if(typeof init.bonusProgram !== "string") throw "init.bonusProgram should be string";
      let userBonus = await UserBonusProgram.findOne({id: init.bonusProgram, user: init.user});
      if (!userBonus) throw 'Bonus program not found for user'
      if (userBonus.balance < init.amount) {
        throw `UserBonusTransaction user [${init.user}] balance [${userBonus.balance}] not enough [${init.amount}]`  
      }
    } else {
      throw 'UserBonusTransaction.user not defined'
    }

    if (!init.id) {
      init.id = uuid();
    }
    
    next();
  },
  

  
  async afterCreate(record: UserBonusTransaction, next: any) {

    // After writing to the model, core safely calculate new bonuses
    const bonusProgram = await BonusProgram.findOne({id: record.bonusProgram as string});
    const bonusProgramAdapter = await BonusProgram.getAdapter(bonusProgram.id);
    let userBonus = await UserBonusProgram.findOne({id: record.bonusProgram as string, user: record.user});
    if (!userBonus) throw 'Bonus program not found for user'
    if (bonusProgramAdapter !== undefined && userBonus.balance < record.amount) {
      throw `UserBonusTransaction user [${record.user}] balance [${userBonus.balance}] not enough [${record.amount}]`  
    } else {
      let calculate = new Decimal(userBonus.balance);
      if(record.isNegative){
        calculate.minus(record.amount)
      } else {
        calculate.plus(record.amount)
      }
      let newBalance = parseFloat(calculate.toFixed(bonusProgram.decimals ?? 0));
      const user =  await User.findOne({id: record.user as string});
      await bonusProgramAdapter.writeTransaction(bonusProgram, user, record);
      await UserBonusProgram.updateOne({id: userBonus.id}, {balance: newBalance});
      
      // Set IsStable
      await UserBonusTransaction.updateOne({id: record.id}, {isStable: true});
    }

    next();
  },

  beforeDestroy() {
    throw 'destory bonus transaction not allowed'
  },

  beforeUpdate(record: OptionalAll<UserBonusTransaction>, next: Function) {
    /**
     * only stability updates allowed
     */
    if (record.isStable === true) {
      record = {
        id: record.id,
        isStable: record.isStable
      }
    } else {
      throw 'update bonus transaction not allowed'
    }
    if (Object.keys(record).length !== 2) throw 'only isStable allwed for update'
    next();
  },
};
/**
 * When paying or accruing a transaction, core write it to the UserBonusTransaction model.
 * Further, the systems that will be docked must themselves implement synchronization with the external system,
 * to replenish and withdraw bonuses.
 * 
 * Before making a transaction, the core compares whether the user has an available balance
 */
module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const UserBonusTransaction: typeof Model & ORMModel<UserBonusTransaction, "user" | "amount" | "bonusProgram">;
}
