import BonusProgramAdapter, { BonusTransaction, ConfigBonusProgramAdapter } from "../../../adapters/bonusprogram/BonusProgramAdapter";
import User from "../../../models/User";
import UserBonusTransaction from "../../../models/UserBonusTransaction";
import UserBonusProgram from "../../../models/UserBonusProgram";
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
    registration(user: User): Promise<string>;
    delete(user: User): Promise<void>;
    isRegistred(user: User): Promise<boolean>;
    getBalance(user: User): Promise<number>;
    getTransactions(user: User, afterTime: Date, limit?: number, skip?: number): Promise<BonusTransaction[]>;
    writeTransaction(user: User, _ubp: UserBonusProgram, userBonusTransaction: UserBonusTransaction): Promise<BonusTransaction>;
    setORMId(id: string): void;
}
