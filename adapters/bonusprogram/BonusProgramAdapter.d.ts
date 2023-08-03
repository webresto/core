import UserBonusTransaction from "../../models/UserBonusTransaction";
import BonusProgram from "../../models/BonusProgram";
import User from "../../models/User";
export type ConfigBonusProgramAdapter = {
    [key: string]: number | boolean | string;
};
interface optionalId {
    id?: string;
}
export interface BonusTransaction extends Pick<UserBonusTransaction, "externalId" | "isNegative" | "group" | "amount" | "customData" | "time" | "balanceAfter">, optionalId {
}
export default abstract class BonusProgramAdapter {
    id: string;
    readonly config: ConfigBonusProgramAdapter;
    /** Adapter name */
    abstract readonly name: string;
    abstract readonly adapter: string;
    abstract readonly exchangeRate: number;
    abstract readonly coveragePercentage: number;
    abstract readonly decimals: number;
    abstract readonly description: string;
    constructor(config?: ConfigBonusProgramAdapter);
    /**
     * method for set ORMid
     * this.id = id;
     */
    setORMId(id: string): void;
    /**
     * Return user balance
     */
    abstract getBalance(user: User): Promise<number>;
    /**
     * Registration user
     */
    abstract registration(user: User): Promise<void>;
    /**
     * Delete user
     */
    abstract delete(user: User): Promise<void>;
    /**
     * Check registred user or not
     */
    abstract isRegistred(user: User): Promise<boolean>;
    /**
     * write user transaction
     */
    abstract writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<BonusTransaction>;
    /**
     * Return user
     * @param afterTime - UNIX seconds
     */
    abstract getTransactions(user: User, afterTime: Date, limit?: number, skip?: number): Promise<BonusTransaction[]>;
    /**
     * A method for creating and obtaining an existing Bonus Adapter
     * @param params - Parameters for initialization
     */
    static getInstance(...params: any[]): BonusProgramAdapter;
}
export {};
