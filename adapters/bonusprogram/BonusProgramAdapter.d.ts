import UserBonusTransaction from "../../models/UserBonusTransaction";
import BonusProgram from "../../models/BonusProgram";
import User from "../../models/User";
export type ConfigBonusProgramAdapter = {
    [key: string]: number | boolean | string;
};
interface optionalId {
    id?: string;
}
export interface BonusTransaction extends Pick<UserBonusTransaction, "isNegative" | "group" | "amount" | "customData">, optionalId {
}
export default abstract class BonusProgramAdapter {
    readonly config: ConfigBonusProgramAdapter;
    /** Adapter name */
    readonly name: string;
    readonly adapter: string;
    readonly exchangeRate: number;
    readonly coveragePercentage: number;
    readonly decimals: number;
    readonly description: string;
    constructor(config?: ConfigBonusProgramAdapter);
    /**
     * Return user balance
     */
    abstract getBalance(user: User): Promise<number>;
    /**
     * write user transaction
     */
    abstract writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<void>;
    /**
     * Return user
     * @param afterTime - UNIX seconds
     */
    abstract getTransactions(user: User, afterTime: string, limit: number, skip: number): Promise<BonusTransaction[]>;
    /**
     * Метод для создания и получения уже существующего Payment adapterа
     * @param params - параметры для инициализации
     */
    static getInstance(...params: any[]): BonusProgramAdapter;
}
export {};
