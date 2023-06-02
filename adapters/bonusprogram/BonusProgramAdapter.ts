import UserBonusTransaction from "../../models/UserBonusTransaction"
import BonusProgram from "../../models/BonusProgram"
import User from "../../models/User"

type InitBonusProgramAdapter = {
  id: string,
  adapter: string
}

interface optionalId {id?: string}
interface BonusTransaction extends Pick<UserBonusTransaction, "isNegative" | "group" | "amount" | "customData" > , optionalId {}


export default abstract class BonusProgramAdapter {
  public readonly InitBonusProgramAdapter: InitBonusProgramAdapter;
  
  /** Adapter name */
  public readonly name: string
  public readonly exchangeRate: number
  public readonly coveragePercentage: number 
  public readonly decimals: string
  public readonly description: string

  protected constructor(InitBonusProgramAdapter: InitBonusProgramAdapter) {
    this.InitBonusProgramAdapter = InitBonusProgramAdapter;
    BonusProgram.alive(this);
  }

  // TODO: нужен способ выключени бонусов автоматически


  /**
   * Return user balance
   */
   public abstract getBalance(user: User): Promise<number>;

  /**
   * write user transaction
   */
  public abstract writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<number>;

  /**
   * Return user 
   * @param afterTime - UNIX seconds
   */
   public abstract getTransactions(user: User, afterTime: string, limit: number, skip: number): Promise<BonusTransaction[]>;

  /**
   * Метод для создания и получения уже существующего Payment adapterа
   * @param params - параметры для инициализации
   */
  static getInstance(...params): BonusProgramAdapter {
    return BonusProgramAdapter.prototype;
  }
}
