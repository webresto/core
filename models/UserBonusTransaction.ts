import ORM from "../interfaces/ORM";

import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
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
