import ORM from "../interfaces/ORM";

import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { BonusProgramRecord } from "./BonusProgram";
import { UserRecord } from "./User";
import Decimal from "decimal.js";
import { BonusTransaction } from "../adapters/bonusprogram/BonusProgramAdapter";

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
  isNegative: {
    type: "boolean",
    required: true,
  } as unknown as boolean,

  /** Custom badges */
  group: "string",

  /** Text */
  comment: "string",

  amount: {
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

  /**
   * Indicates that the transaction was canceled
   */
  canceled: {
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


export interface UserBonusTransactionRecord extends RequiredField<OptionalAll<attributes>, "isNegative" | "bonusProgram" | "user" | "amount" >, ORM {}

let Model = {
  /**
   * Before create, a check is made to see if there are enough funds to write off.
   * Immediately after create saving the transaction in the local database, the external adapter is called to save the transaction
   */
  async beforeCreate(init: UserBonusTransactionRecord, cb: (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }

    if(init.isStable === undefined) {
      init.isStable = true;
    }

    return cb();
  },

  async afterCreate(record: UserBonusTransactionRecord, cb:  (err?: string) => void) {
    return cb();
  },

  // beforeDestroy() {
  // },

  beforeUpdate(record: OptionalAll<UserBonusTransactionRecord>, cb:  (err?: string) => void) {
    return cb();
  },

  async sync(user: UserRecord | string,  bonusProgram: BonusProgramRecord | string, balanceOnly = true): Promise<void>{
    try {
      if(typeof user === "string") {
        user = await User.findOne({id: user})
      }

      if(typeof bonusProgram === "string") {
        bonusProgram = await BonusProgram.findOne({id: bonusProgram})
      }

      if(!user || !bonusProgram){
        throw `User or BonusProgram not found: user: [${user.login}] bonusProgram: [${bonusProgram}]`
      }

      const userBonusProgram = await UserBonusProgram.findOne({user: user.id, bonusProgram: bonusProgram.id});
      if(!userBonusProgram){
        throw `UserBonusProgram not found: user: [${user.login}] bonusProgram: [${bonusProgram}]`
      }




      if (!user || !bonusProgram || !userBonusProgram) {
        throw `sync > user, bonusprogram, userBonusProgram not found`
      }

      const adapter = await BonusProgram.getAdapter(bonusProgram.adapter);
      let extBalance =  parseFloat(new Decimal(await adapter.getBalance(user, userBonusProgram)).toFixed(bonusProgram.decimals));

      sails.log.debug(`Sync UserBonusProgram for user ${user.login}, extBalance: ${extBalance}, balanceOnly: ${balanceOnly}`);

      if(balanceOnly) {
        await UserBonusProgram.update({id: userBonusProgram.id}, {balance: extBalance}).fetch();
        return
      }

      // Full sync: transactions + balance
      let afterTime = new Date(0);
      if(userBonusProgram.syncedToTime && userBonusProgram.syncedToTime !== "0"){
        try {
          afterTime = new Date(userBonusProgram.syncedToTime);
        } catch {}
      } else {
        try {
          const SYNC_BONUSTRANSACTION_AFTER_TIME = await Settings.get('SYNC_BONUSTRANSACTION_AFTER_TIME') ?? 0;
          afterTime = new Date(SYNC_BONUSTRANSACTION_AFTER_TIME);
        } catch {}
      }

      let skip = 0;
      const limit = 10;

      while (true) {
        const transactions: BonusTransaction[] = await adapter.getTransactions(user, afterTime, limit, skip);
        if (transactions.length === 0) {
          break;
        }

        for (const transaction of transactions) {
          const userBonusTransaction: UserBonusTransactionRecord = {
            isNegative: transaction.isNegative,
            externalId: transaction.externalId,
            group: transaction.group,
            amount: transaction.amount,
            isDeleted: false,
            isStable: true,
            bonusProgram: bonusProgram.id,
            user: user.id,
            customData: transaction.customData
          };

          if(transaction.externalId) {
            await UserBonusTransaction.findOrCreate({externalId: transaction.externalId}, userBonusTransaction)
          } else {
            await UserBonusTransaction.create(userBonusTransaction).fetch();
          }
        }

        if (transactions.length < limit) {
          break;
        }

        skip += limit;
      }

      await UserBonusProgram.update({id: userBonusProgram.id}, {balance: extBalance, syncedToTime: new Date().toISOString()}).fetch();
    } catch (error) {
      sails.log.error(error)
    }
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
