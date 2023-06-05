import ORM from "../interfaces/ORM";

import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import User from "../models/User";
import BonusProgram from "../models/BonusProgram";
import Decimal from "decimal.js";

let attributes = {
  /** ID */
  id: {
    type: "string",
  } as unknown as string,

  /** Type of bonuses (default: true)
   * came is incoming (positive transaction)
   * gone is outgoin (negative transaction)
   */
  isNegative: "boolean" as unknown as boolean,

  /** Custom badges */
  group: "string",

  amount: {
    type: "number",
  } as unknown as number,

  /** automatic recalculate */
  balanceAfter: {
    type: "number",
  } as unknown as number,

  /** User can delete transaction */
  isDeleted: {
    type: "boolean",
  } as unknown as boolean,

  /**
   * Indicates whether the call was made after creation. If so, this means that the bonus adapter worked without errors
   */
  isStable: {
    type: "boolean",
  } as unknown as boolean,

  bonusProgram: {
    model: "bonusprogram",
    required: true,
  } as unknown as BonusProgram | string,

  user: {
    model: "user",
    required: true,
  } as unknown as User | string,

  customData: "json" as unknown as
    | {
        [key: string]: string | boolean | number;
      }
    | string,
};

type attributes = typeof attributes;

interface UserBonusTransaction extends RequiredField<OptionalAll<attributes>, "id" | "isNegative" | "bonusProgram" | "user">, ORM {}
export default UserBonusTransaction;

let Model = {
  async beforeCreate(init: UserBonusTransaction, cb: (err?: string) => void) {
    try {
      if (!init.id) {
        init.id = uuid();
      }

      let userBonus = await UserBonusProgram.findOne({ bonusProgram: init.bonusProgram as string, user: init.user });
      
      if (!userBonus) cb("beforeCreate: Bonus program not found for user");

      // set negative by default
      if (init.isNegative === undefined) {
        init.isNegative = true;
        init.isStable = false;
      }

      // If Bonus program not active, should stop
      let bonusProgram = await BonusProgram.findOne({ id: init.bonusProgram as string });

      const bonusProgramAdapterExist = await BonusProgram.isAlived(bonusProgram.adapter);
      if (!bonusProgramAdapterExist) cb(`Bonus program not alived`);

      if (init.isNegative === true) {
        if (bonusProgramAdapterExist && init.user !== undefined && typeof init.user === "string") {
          if (userBonus.balance < init.amount) {
            cb(`UserBonusTransaction user [${init.user}] balance [${userBonus.balance}] not enough [${init.amount}]`);
          }
        } else {
          cb("UserBonusTransaction user not defined");
        }
      }
      cb();
    } catch (error) {
      sails.log.error(error);
      cb(error);
    }
  },

  async afterCreate(record: UserBonusTransaction, cb:  (err?: string) => void) {
    try {
      // After writing to the model, core safely calculate new bonuses
      const bonusProgram = await BonusProgram.findOne({ id: record.bonusProgram as string });
      const bonusProgramAdapter = await BonusProgram.getAdapter(bonusProgram.adapter);
      let userBonus = await UserBonusProgram.findOne({ bonusProgram: bonusProgram.id as string, user: record.user });
      if (!userBonus) cb("afterCreate: Bonus program not found for user");
      
      
      if (bonusProgramAdapter !== undefined) {
        
        if(record.isNegative === true && userBonus.balance < record.amount ){
          cb(`UserBonusTransaction user [${record.user}] balance [${userBonus.balance}] not enough [${record.amount}]`);
        }

        let calculate = new Decimal(userBonus.balance);
        if (record.isNegative === true) {
          calculate = calculate.minus(record.amount);
        } else {
          calculate = calculate.plus(record.amount);
        }

        let newBalance = parseFloat(calculate.toFixed(bonusProgram.decimals ?? 0));
        const user = await User.findOne({ id: record.user as string });

        // First write transaction
        await UserBonusProgram.updateOne({ id: userBonus.id }, { balance: newBalance });

        // Exec write unstabled transaction in external system
        if (record.isStable !== true) {
          try {
            await bonusProgramAdapter.writeTransaction(bonusProgram, user, record);
          } catch (error) {
            if ((await Settings.get("DISABLE_BONUSPROGRAM_ON_ERROR")) === true) {
              await BonusProgram.updateOne({ id: bonusProgram.id }, { enable: false });
            }
           cb(error);
          }
          // Set IsStable
          await UserBonusTransaction.updateOne({ id: record.id }, { isStable: true });
        }
      }
      cb();
    } catch (error) {
      sails.log.error(error);
      cb(error);
    }
  },

  beforeDestroy() {
    throw "destory bonus transaction not allowed";
  },

  beforeUpdate(record: OptionalAll<UserBonusTransaction>, cb:  (err?: string) => void) {
    /**
     * only stability updates allowed
     */
    if (record.isStable === true) {
      record = {
        id: record.id,
        isStable: record.isStable,
      };
    } else {
      throw "update bonus transaction not allowed";
    }
    if (Object.keys(record).length !== 2) throw "only isStable allwed for update";
    cb();
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
