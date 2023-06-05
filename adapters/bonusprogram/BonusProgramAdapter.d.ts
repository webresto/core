import UserBonusTransaction from "../../models/UserBonusTransaction";
import BonusProgram from "../../models/BonusProgram";
import User from "../../models/User";
<<<<<<< HEAD
type InitBonusAdapter = {
    id: string;
    adapter: string;
=======
export type ConfigBonusProgramAdapter = {
    [key: string]: number | boolean | string;
>>>>>>> origin/bonuses
};
interface optionalId {
    id?: string;
}
<<<<<<< HEAD
interface BonusTransaction extends Pick<UserBonusTransaction, "type" | "group" | "amount" | "customData">, optionalId {
}
export default abstract class BonusAdapter {
    readonly InitBonusAdapter: InitBonusAdapter;
    protected constructor(InitBonusAdapter: InitBonusAdapter);
=======
export interface BonusTransaction extends Pick<UserBonusTransaction, "isNegative" | "group" | "amount" | "customData">, optionalId {
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
>>>>>>> origin/bonuses
    /**
     * Return user balance
     */
    abstract getBalance(user: User): Promise<number>;
    /**
<<<<<<< HEAD
     * write user transaction
     */
    abstract writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<number>;
=======
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
    abstract writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<void>;
>>>>>>> origin/bonuses
    /**
     * Return user
     * @param afterTime - UNIX seconds
     */
<<<<<<< HEAD
    abstract getTransactions(user: User, afterTime: string, limit: number, skip: number): Promise<BonusTransaction[]>;
    /**
     * Метод для создания и получения уже существующего Payment adapterа
     * @param params - параметры для инициализации
     */
    static getInstance(...params: any[]): BonusAdapter;
=======
    abstract getTransactions(user: User, afterTime: string, limit?: number, skip?: number): Promise<BonusTransaction[]>;
    /**
     * A method for creating and obtaining an existing Payment Adapter
     * @param params - Parameters for initialization
     */
    static getInstance(...params: any[]): BonusProgramAdapter;
>>>>>>> origin/bonuses
}
export {};
