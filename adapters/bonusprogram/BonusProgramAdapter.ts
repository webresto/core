import UserBonusTransaction from "../../models/UserBonusTransaction"
import BonusProgram from "../../models/BonusProgram"
import User from "../../models/User"

type InitBonusAdapter = {
  id: string,
  adapter: string
}

interface optionalId {id?: string}
interface BonusTransaction extends Pick<UserBonusTransaction, "type" | "group" | "amount" | "customData" > , optionalId {}


export default abstract class BonusAdapter {
  public readonly InitBonusAdapter: InitBonusAdapter;

  protected constructor(InitBonusAdapter: InitBonusAdapter) {
    this.InitBonusAdapter = InitBonusAdapter;
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
  static getInstance(...params): BonusAdapter {
    return BonusAdapter.prototype;
  }
}
