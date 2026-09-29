import BonusProgramAdapter, { BonusTransaction } from "../../../adapters/bonusprogram/BonusProgramAdapter";
import { UserRecord } from "../../../models/User";
import { UserBonusProgramRecord } from "../../../models/UserBonusProgram";

/**
 * An external bonus system for the tests: it registers with core the way a
 * real one does (`BonusProgram.alive`) and keeps each customer's balance and
 * transactions itself. Bonuses cover at most half the amount, to one decimal.
 */
export class TestBonusSystem extends BonusProgramAdapter {
  public readonly name = "Bonus 1";
  public readonly adapter = "bonus-1";
  public readonly exchangeRate = 1;
  public readonly coveragePercentage = 0.5;
  public readonly decimals = 1;
  public readonly description = "Bonus 1";

  readonly balances = new Map<string, number>();
  readonly transactions = new Map<string, BonusTransaction[]>();

  async registration(user: UserRecord): Promise<string> {
    if (!this.balances.has(user.id)) this.balances.set(user.id, 0);
    this.transactions.set(user.id, this.transactions.get(user.id) ?? []);
    return `external-${user.id}`;
  }

  async delete(user: UserRecord): Promise<void> {
    this.balances.delete(user.id);
    this.transactions.delete(user.id);
  }

  async isRegistered(user: UserRecord): Promise<boolean> {
    return this.balances.has(user.id);
  }

  async getUserInfo(user: UserRecord): Promise<any> {
    return { id: user.id, externalId: `external-${user.id}`, externalCustomerId: `external-${user.id}`, balance: this.balances.get(user.id) ?? 0 };
  }

  async getBalance(user: UserRecord, _ubp: UserBonusProgramRecord): Promise<number> {
    return this.balances.get(user.id) ?? 0;
  }

  async writeTransaction(user: UserRecord, _ubp: UserBonusProgramRecord, transaction: BonusTransaction): Promise<BonusTransaction> {
    const written = { ...transaction, externalId: `transaction-${Date.now()}-${Math.random()}`, time: new Date().toISOString() } as BonusTransaction;
    this.transactions.get(user.id)?.push(written);
    this.balances.set(user.id, (this.balances.get(user.id) ?? 0) + (transaction.isNegative ? -transaction.amount : transaction.amount));
    return written;
  }

  async getTransactions(user: UserRecord, afterTime: Date): Promise<BonusTransaction[]> {
    return (this.transactions.get(user.id) ?? []).filter((transaction: any) => new Date(transaction.time) > afterTime);
  }
}

/** A running test bonus system and its enabled bonus program. Called after `resetDatabase`. */
export async function startBonusSystem(): Promise<{ system: TestBonusSystem; bonusProgram: string }> {
  const system = new TestBonusSystem();
  await BonusProgram.alive(system);
  const [program] = await BonusProgram.update({ adapter: system.adapter }, { enable: true }).fetch();
  return { system, bonusProgram: program.id };
}
