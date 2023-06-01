import User from "../../../models/User";
import BonusAdapter from "../BonusProgramAdapter";

export class DefaultBonusProgramAdater extends BonusAdapter {
  public getBalance(user: User): Promise<number> {
    throw new Error("Method not implemented.");
  }
  public getTransactions(user: User, afterTime: string, limit: number, skip: number): Promise<BonusTransaction[]> {
    throw new Error("Method not implemented.");
  }
}