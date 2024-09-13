import BonusProgramAdapter, { BonusTransaction, ConfigBonusProgramAdapter } from "../../../adapters/bonusprogram/BonusProgramAdapter";
import { RequiredField } from "../../../interfaces/toolsTS";
export declare class InMemoryBonusProgramAdapter extends BonusProgramAdapter {
    getUserInfo(user: User): Promise<RequiredField<Partial<Pick<Omit<UserBonusProgram, "id"> & User, "id" | "firstName" | "lastName" | "sex" | "email" | "birthday" | "externalId" | "externalCustomerId" | "balance">>, "id" | "externalId" | "externalCustomerId">>;
    private transactions;
    private users;
    name: string;
    adapter: string;
    exchangeRate: number;
    coveragePercentage: number;
    decimals: number;
    description: string;
    balance: {
        [key: string]: number;
    };
    constructor(config?: ConfigBonusProgramAdapter);
    registration(user: User): Promise<string>;
    delete(user: User): Promise<void>;
    isRegistered(user: User): Promise<boolean>;
    getBalance(user: User, _ubp: UserBonusProgram): Promise<number>;
    getTransactions(user: User, afterTime: Date, limit?: number, skip?: number): Promise<BonusTransaction[]>;
    writeTransaction(user: User, _ubp: UserBonusProgram, userBonusTransaction: UserBonusTransaction): Promise<BonusTransaction>;
    setORMId(id: string): void;
}
