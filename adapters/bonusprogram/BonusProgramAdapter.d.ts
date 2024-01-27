import UserBonusTransaction from "../../models/UserBonusTransaction";
import UserBonusProgram from "../../models/UserBonusProgram";
import User from "../../models/User";
import { RequiredField } from "../../interfaces/toolsTS";
export type ConfigBonusProgramAdapter = {
    [key: string]: number | boolean | string;
};
interface optionalId {
    id?: string;
}
export interface BonusTransaction extends Pick<UserBonusTransaction, "externalId" | "isNegative" | "group" | "amount" | "customData" | "time" | "balanceAfter">, optionalId {
}
export default abstract class BonusProgramAdapter {
    /** Id program in external system */
    externalId: string;
    id: string;
    readonly config: ConfigBonusProgramAdapter;
    /** Adapter name */
    abstract readonly name: string;
    abstract readonly adapter: string;
    /**
     * Excahange rate for main currency in core
     */
    abstract readonly exchangeRate: number;
    /**
     * How many bonuses can be spent for order
     */
    abstract readonly coveragePercentage: number;
    /**
     * Fixed after dot eg: 1.22, 0.9, 123
     */
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
    abstract getBalance(user: User, userBonusProgram: UserBonusProgram): Promise<number>;
    /**
     * Registration user
     */
    abstract registration(user: User): Promise<string>;
    /**
     * Delete user
     */
    abstract delete(user: User): Promise<void>;
    /**
     * Check registred user or not
     */
    abstract isRegistred(user: User): Promise<boolean>;
    /**
     * Check registred user or not
     */
    abstract getUserInfo(user: User): Promise<RequiredField<Partial<Pick<Omit<UserBonusProgram, "id"> & User, "id" | "balance" | "birthday" | "email" | "firstName" | "sex" | "lastName" | "externalId" | "externalCustomerId">>, "id" | "externalId" | "externalCustomerId">>;
    /**
     * write user transaction
     */
    abstract writeTransaction(user: User, userBonusProgram: UserBonusProgram, userBonusTransaction: UserBonusTransaction): Promise<BonusTransaction>;
    /**
     * Return user
     * @param afterTime - UNIX seconds
     */
    abstract getTransactions(user: User, afterTime: Date, limit?: number, skip?: number): Promise<BonusTransaction[]>;
    /**
     * A method for creating and obtaining an existing Bonus Adapter
     * @param params - Parameters for initialization
     *
     */
    static getInstance(config: ConfigBonusProgramAdapter): BonusProgramAdapter;
}
export {};
