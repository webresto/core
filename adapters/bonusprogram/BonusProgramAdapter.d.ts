import UserBonusTransaction from "../../models/UserBonusTransaction";
import BonusProgram from "../../models/BonusProgram";
import User from "../../models/User";
type InitBonusProgramAdapter = {
    id: string;
    adapter: string;
};
interface optionalId {
    id?: string;
}
interface BonusTransaction extends Pick<UserBonusTransaction, "type" | "group" | "amount" | "customData">, optionalId {
}
export default abstract class BonusProgramAdapter {
    readonly InitBonusProgramAdapter: InitBonusProgramAdapter;
    protected constructor(InitBonusProgramAdapter: InitBonusProgramAdapter);
    /**
     * Return user balance
     */
    abstract getBalance(user: User): Promise<number>;
    /**
     * write user transaction
     */
    abstract writeTransaction(bonusProgram: BonusProgram, user: User, userBonusTransaction: UserBonusTransaction): Promise<number>;
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
