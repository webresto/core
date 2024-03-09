import UserBonusTransaction from "../../models/UserBonusTransaction";
import UserBonusProgram from "../../models/UserBonusProgram";
import User from "../../models/User";
import { RequiredField } from "../../interfaces/toolsTS";

export type ConfigBonusProgramAdapter = {
  [key: string]: number | boolean | string;
};

export type ExternalAbstractUser = RequiredField<Partial<Pick<Omit<UserBonusProgram, "id"> & User, "id" | "firstName" | "lastName" | "sex" | "email" | "birthday" | "balance" | "externalId" | "externalCustomerId">>, "id" | "externalId" | "externalCustomerId">;

interface optionalId {
  id?: string;
}
export interface BonusTransaction extends Pick<UserBonusTransaction, "externalId" | "isNegative" | "group" | "amount" | "customData" | "time" | "balanceAfter">, optionalId { }

export default abstract class BonusProgramAdapter {
  /** Program's id in an external system */
  public externalId: string;

  public id: string;
  public readonly config: ConfigBonusProgramAdapter = {};

  /** Adapter name */
  public abstract readonly name: string;

  public abstract readonly adapter: string;


  /**
   * Exchange rate for the main currency in core
   */
  public abstract readonly exchangeRate: number;

  /**
   * How many bonuses can be spent for order
   */
  public abstract readonly coveragePercentage: number;

  /**
   * Fixed after dot eg: 1.22, 0.9, 123
   */
  public abstract readonly decimals: number;
  public abstract readonly description: string;

  public constructor(config?: ConfigBonusProgramAdapter) {
    this.config = config;
  }

  /**
   * method for set ORMid
   * this.id = id;
   */
  setORMId(id: string): void {
    this.id = id;
  }

  /**
   * Return user balance
   */
  public abstract getBalance(user: User, userBonusProgram: UserBonusProgram): Promise<number>;


  /**
   * Registration user
   */
  public abstract registration(user: User): Promise<string>;

  /**
   * Delete user
   */
  public abstract delete(user: User): Promise<void>;

  /**
   * Check if user registered or not
   */
  public abstract isRegistered(user: User): Promise<boolean>;

  /**
   * Check registered user or not
   */
  public abstract getUserInfo(user: User): Promise<ExternalAbstractUser>


  /**
   * write user transaction
   */
  public abstract writeTransaction(user: User, userBonusProgram: UserBonusProgram, userBonusTransaction: UserBonusTransaction): Promise<BonusTransaction>;

  /**
   * Return BonusTransaction
   * @param user
   * @param afterTime - UNIX seconds
   * @param limit
   * @param skip
   */
  public abstract getTransactions(user: User, afterTime: Date, limit?: number, skip?: number): Promise<BonusTransaction[]>;

  /**
   * A method for creating and obtaining an existing Bonus Adapter
   *
   * @param config
   */
  static getInstance(config: ConfigBonusProgramAdapter): BonusProgramAdapter {
    return BonusProgramAdapter.prototype;
  }
}
