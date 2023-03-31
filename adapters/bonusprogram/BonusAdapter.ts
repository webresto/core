import UserBonusTransaction from "../../models/UserBonusTransaction"
import User from "../../models/User"

type InitBonusAdapter = {
  id: string
}

interface optionalId {id?: string}
interface BonusTransaction extends Pick<UserBonusTransaction, "type" | "group" | "amount" | "customData" > , optionalId {}


export default abstract class BonusAdapter {
  public readonly InitBonusAdapter: InitBonusAdapter;

  protected constructor(InitBonusAdapter: InitBonusAdapter) {
    this.InitBonusAdapter = InitBonusAdapter;
    BonusProgram.alive(this);
  }



  /**
   * Return user balance
   */
   public abstract getBalance(user: User): Promise<number>;

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
