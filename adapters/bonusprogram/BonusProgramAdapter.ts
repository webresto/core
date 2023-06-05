import UserBonusTransaction from "../../models/UserBonusTransaction";
import BonusProgram from "../../models/BonusProgram";
import User from "../../models/User";

export type ConfigBonusProgramAdapter = {
  [key: string]: number | boolean | string;
};

interface optionalId {
  id?: string;
}
export interface BonusTransaction extends Pick<UserBonusTransaction, "isNegative" | "group" | "amount" | "customData">, optionalId {}

export default abstract class BonusProgramAdapter {
  public id: string;
  public readonly config: ConfigBonusProgramAdapter = {};

  /** Adapter name */
  public abstract readonly name: string;

  public abstract readonly adapter: string;

  public abstract readonly exchangeRate: number;
  public abstract readonly coveragePercentage: number;
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
  public abstract getBalance(user: User): Promise<number>;


  /**
   * Registration user
   */
  public abstract registration(user: User): Promise<void>;

  /**
   * Delete user
   */
  public abstract delete(user: User): Promise<void>;

  /**
   * Check registred user or not
   */
  public abstract isRegistred(user: User): Promise<boolean>;

  /**
   * write user transaction
   */
  public abstract writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<void>;

  /**
   * Return user
   * @param afterTime - UNIX seconds
   */
  public abstract getTransactions(user: User, afterTime: string, limit?: number, skip?: number): Promise<BonusTransaction[]>;

  /**
   * A method for creating and obtaining an existing Payment Adapter
   * @param params - Parameters for initialization
   */
  static getInstance(...params): BonusProgramAdapter {
    return BonusProgramAdapter.prototype;
  }
}
