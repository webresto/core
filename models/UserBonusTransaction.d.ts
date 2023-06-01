import ORM from "../interfaces/ORM";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import ORMModel from "../interfaces/ORMModel";
import User from "../models/User";
import BonusProgram from "../models/BonusProgram";
declare let attributes: {
    /** ID */
    id: string;
    /** Type of bonuses (default: true)
    * came is incoming (positive transaction)
    * gone is outgoin (negative transaction)
    */
    isNegative: boolean;
    /** Custom badges */
    group: string;
    amount: number;
    /** automatic recalculate */
    balanceAfter: number;
    /** User can delete transaction */
    isDeleted: boolean;
    /**
     * Indicates whether the call was made after creation. If so, this means that the bonus adapter worked without errors
     */
    isStable: boolean;
    bonusProgram: string | BonusProgram;
    user: string | User;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface UserBonusTransaction extends RequiredField<OptionalAll<attributes>, "id" | "isNegative" | "bonusProgram" | "user">, ORM {
}
export default UserBonusTransaction;
declare let Model: {
    beforeCreate(init: UserBonusTransaction, next: any): Promise<void>;
    afterCreate(record: UserBonusTransaction, next: any): Promise<void>;
    beforeDestroy(): never;
    beforeUpdate(record: OptionalAll<UserBonusTransaction>, next: Function): void;
};
declare global {
    const UserBonusTransaction: typeof Model & ORMModel<UserBonusTransaction, "user" | "amount" | "bonusProgram">;
}
