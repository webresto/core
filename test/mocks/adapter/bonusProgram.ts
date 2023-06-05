import BonusProgramAdapter, { BonusTransaction, ConfigBonusProgramAdapter } from "../../../adapters/bonusprogram/BonusProgramAdapter";
import User from "../../../models/User";

export class MockBonusProgramAdapter extends BonusProgramAdapter {

  public name: string = "test bonus adapter name";
  public adapter: string = "test";
  public exchangeRate: number = 10;
  public coveragePercentage: number = 0.5; 
  public decimals: number = 1;
  public description: string = "Mock for BonusProgramAdapter"
  
  public constructor(config?: ConfigBonusProgramAdapter) {
    super(config);
  }

  public async registration(user: User): Promise<void> {
    return
  }
  public delete(user: User): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public isRegistred(user: User): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  public getBalance(user: User): Promise<number> {
    throw new Error("Method not implemented.");
  }
  public getTransactions(user: User, afterTime: string, limit: number, skip: number): Promise<BonusTransaction[]> {
    throw new Error("Method not implemented.");
  }

  // Implement required methods here
  async writeTransaction(bonusProgram, user, transaction) {
    // Your logic here
  }

  async readTransaction(bonusProgram, user) {
    // Your logic here
  }

  async balance(user, bonusProgram) {
    // Your logic here
  }

  async applyBonus(bonusProgram, user, order) {
    // Your logic here
  }
}
