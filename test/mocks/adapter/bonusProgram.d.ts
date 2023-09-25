import BonusProgramAdapter, { BonusTransaction, ConfigBonusProgramAdapter } from "../../../adapters/bonusprogram/BonusProgramAdapter";
import User from "../../../models/User";
import BonusProgram from "../../../models/BonusProgram";
import UserBonusTransaction from "../../../models/UserBonusTransaction";
export declare class InMemoryBonusProgramAdapter extends BonusProgramAdapter {
    private transactions;
    private users;
    name: string;
    adapter: string;
    exchangeRate: number;
    coveragePercentage: number;
    decimals: number;
    description: string;
    constructor(config?: ConfigBonusProgramAdapter);
    registration(user: User): Promise<void>;
    delete(user: User): Promise<void>;
    isRegistred(user: User): Promise<boolean>;
    getBalance(user: User): Promise<number>;
    getTransactions(user: User, afterTime: Date, limit?: number, skip?: number): Promise<BonusTransaction[]>;
    writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<BonusTransaction>;
    setORMId(id: string): void;
}
