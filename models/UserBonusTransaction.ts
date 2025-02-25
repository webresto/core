import ORM from "../interfaces/ORM";

import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import Decimal from "decimal.js";
import { BonusTransaction } from "../adapters/bonusprogram/BonusProgramAdapter";
import { BonusProgramRecord } from "./BonusProgram";
import { UserRecord } from "./User";

let attributes = {
  /** ID */
  id: {
    type: "string",
  } as unknown as string,

  /**
   * ID transaction in 3d party system
   * */
  externalId: {
    type: "string",
    allowNull: true
  } as unknown as string,

  /** Type of bonuses (default: true)
   * came is incoming (positive transaction)
   * gone is outgoing (negative transaction)
   */
  isNegative: "boolean" as unknown as boolean,

  /** Custom badges */
  group: "string",

  /** Text */
  comment: "string",

  amount: {
    type: "number",
  } as unknown as number,

  /** automatic recalculate */
  balanceAfter: {
    type: "number"
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

  /** UTC time */
  time: "string",

  bonusProgram: {
    model: "bonusprogram",
    required: true,
  } as unknown as BonusProgramRecord | string,

  user: {
    model: "user",
    required: true,
  } as unknown as UserRecord | string,

  customData: "json" as unknown as
    | {
        [key: string]: string | boolean | number;
      }
    | string,
};

type attributes = typeof attributes;


/**
 * @deprecated use `UserBonusTransactionRecord` instead
 */
interface UserBonusTransaction extends RequiredField<OptionalAll<attributes>, "isNegative" | "bonusProgram" | "user" | "amount" >, ORM {}

export interface UserBonusTransactionRecord extends RequiredField<OptionalAll<attributes>, "isNegative" | "bonusProgram" | "user" | "amount" >, ORM {}

let Model = {
  /**
   * Before create, a check is made to see if there are enough funds to write off.
   * Immediately after create saving the transaction in the local database, the external adapter is called to save the transaction
   */
  async beforeCreate(init: UserBonusTransactionRecord, cb: (err?: string) => void) {
    try {
      if (!init.id) {
        init.id = uuid();
      }

      if(!init.isStable) {
        init.isStable = false;
      }

      // set negative by default
      if (init.isNegative === undefined) {
        init.isNegative = true;
      }

      // If Bonus program not active, should stop
      let bonusProgram = await BonusProgram.findOne({ id: init.bonusProgram as string });

      const bonusProgramAdapterExist = await BonusProgram.isAlive(bonusProgram.adapter);
      if (!bonusProgramAdapterExist) cb(`Bonus program not alive`);

      if (init.isNegative === true) {
        if (bonusProgramAdapterExist && init.user !== undefined && typeof init.user === "string") {
          let enough = await UserBonusProgram.checkEnoughToSpend(init.user, init.bonusProgram, init.amount);
          if (enough !== true) {
            // Maybe not needed it for print
            let userBonus = await UserBonusProgram.findOne({ bonusProgram: init.bonusProgram as string, user: init.user });
            if (!userBonus) return cb("beforeCreate: Bonus program not found for user");
            return cb(`UserBonusTransaction beforeCreate > user [${init.user}] balance [${userBonus.balance}] not enough [${init.amount}]`);
          }
        } else {
          return cb("UserBonusTransaction user not defined");
        }
      }
      return cb();
    } catch (error) {
      sails.log.error(error);
      return cb(error);
    }
  },

  async afterCreate(record: UserBonusTransactionRecord, cb:  (err?: string) => void) {
    try {

      // After writing to the model, core safely calculates new bonuses
      const bonusProgram = await BonusProgram.findOne({ id: record.bonusProgram as string });
      const bonusProgramAdapter = await BonusProgram.getAdapter(bonusProgram.adapter);
      let userBonus = await UserBonusProgram.findOne({ bonusProgram: bonusProgram.id as string, user: record.user });
      if (!userBonus) return cb("afterCreate: Bonus program not found for user");


      if (bonusProgramAdapter !== undefined) {

        if(record.isNegative === true && await UserBonusProgram.checkEnoughToSpend(record.user, record.bonusProgram, record.amount) !== true ){
          return cb(`[panic] UserBonusTransaction afterCreate > user [${record.user}] balance [${userBonus.balance}] not enough [${record.amount}]`);
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

        // Exec writes unstable transaction in external system
        let bonusProgramAdapterTransaction = {} as BonusTransaction;
        if (record.isStable !== true) {
          try {
           bonusProgramAdapterTransaction = await bonusProgramAdapter.writeTransaction(user, userBonus, record);
          } catch (error) {
            if ((await Settings.get("DISABLE_USER_BONUS_PROGRAM_ON_FAIL")) === true) {
              await UserBonusProgram.updateOne({ id: userBonus.id }, { isActive: false });
            }
            return cb(error);
          }
          // Check external ID
          if(bonusProgramAdapterTransaction && !bonusProgramAdapterTransaction.externalId){
            return cb(`externalId not defined after write transaction, transaction is not stable`);
          }
          // Set IsStable
          await UserBonusTransaction.updateOne({ id: record.id }, { externalId: bonusProgramAdapterTransaction.externalId ,isStable: true });
        }
      }
      return cb();
    } catch (error) {
      sails.log.error(error);
      return cb(error);
    }
  },

  beforeDestroy() {
    throw "destroy bonus transaction not allowed";
  },

  beforeUpdate(record: OptionalAll<UserBonusTransactionRecord>, cb:  (err?: string) => void) {
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
    if (Object.keys(record).length !== 2) throw "only isStable allowed for update";
    return cb();
  }
};
/**
 * When paying or accruing a transaction, core writes it to the UserBonusTransaction model.
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
  const UserBonusTransaction: typeof Model & ORMModel<UserBonusTransactionRecord, "user" | "amount" | "bonusProgram">;
}
