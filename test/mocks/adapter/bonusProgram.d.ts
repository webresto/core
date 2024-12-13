import BonusProgramAdapter, { BonusTransaction, ConfigBonusProgramAdapter } from "../../../adapters/bonusprogram/BonusProgramAdapter";
import { RequiredField } from "../../../interfaces/toolsTS";
import { UserRecord } from "../../../models/User";
import { UserBonusProgramRecord } from "../../../models/UserBonusProgram";
export declare class InMemoryBonusProgramAdapter extends BonusProgramAdapter {
    getUserInfo(user: UserRecord): Promise<RequiredField<Partial<Pick<Omit<UserBonusProgramRecord, "id"> & UserRecord, "id" | "firstName" | "lastName" | "sex" | "email" | "birthday" | "externalId" | "externalCustomerId" | "balance">>, "id" | "externalId" | "externalCustomerId">>;
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
    registration(user: UserRecord): Promise<string>;
    delete(user: UserRecord): Promise<void>;
    isRegistered(user: UserRecord): Promise<boolean>;
    getBalance(user: UserRecord, _ubp: UserBonusProgramRecord): Promise<number>;
    getTransactions(user: UserRecord, afterTime: Date, limit?: number, skip?: number): Promise<BonusTransaction[]>;
    writeTransaction(user: UserRecord, _ubp: UserBonusProgramRecord, userBonusTransaction: UserBonusTransaction): Promise<BonusTransaction>;
    setORMId(id: string): void;
}
