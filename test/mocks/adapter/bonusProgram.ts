import BonusProgramAdapter, { BonusTransaction, ConfigBonusProgramAdapter } from "../../../adapters/bonusprogram/BonusProgramAdapter";
import User from "../../../models/User";
import BonusProgram from "../../../models/BonusProgram";
import UserBonusTransaction from "../../../models/UserBonusTransaction";

export class InMemoryBonusProgramAdapter extends BonusProgramAdapter {
  private transactions: Map<string, BonusTransaction[]> = new Map();
  private users: Map<string, User> = new Map();

  public name: string = "test bonus adapter name";
  public adapter: string = "test";
  public exchangeRate: number = 10;
  public coveragePercentage: number = 0.5;
  public decimals: number = 1;
  public description: string = "In-memory BonusProgramAdapter";

  public constructor(config?: ConfigBonusProgramAdapter) {
    super(config);
  }

  public async registration(user: User): Promise<void> {
    if (!this.users.has(user.id)) {
      this.users.set(user.id, user);
      this.transactions.set(user.id, []);
    }
  }

  public async delete(user: User): Promise<void> {
    if (this.users.has(user.id)) {
      this.users.delete(user.id);
      this.transactions.delete(user.id);
    }
  }

  public async isRegistred(user: User): Promise<boolean> {
    return this.users.has(user.id);
  }

  public async getBalance(user: User): Promise<number> {
    const transactions = this.transactions.get(user.id) || [];
    return transactions.reduce((total, transaction) => total + (transaction.isNegative ? -transaction.amount : transaction.amount), 0);
  }

  public async getTransactions(user: User, afterTime: Date, limit: number = 0, skip: number = 0): Promise<BonusTransaction[]> {
    const transactions = this.transactions.get(user.id) || [];
    return transactions.filter((transaction) => new Date(transaction.time) > afterTime).slice(skip, limit || undefined);
  }

  public async writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<BonusTransaction> {
    if (!this.users.has(user.id)) {
      throw new Error("User not found");
    }
    const transaction = {
      ...userBonusTransaction,
      id: `${Date.now()}-${Math.random()}`, // generating a random id
      time: new Date().toISOString(),
    };
    this.transactions.get(user.id).push(transaction);
    return transaction;
  }

  setORMId(id: string): void {
    this.id = id;
  }
}