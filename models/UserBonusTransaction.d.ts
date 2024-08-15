import ORM from "../interfaces/ORM";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { ORMModel } from "../interfaces/ORMModel";
import User from "../models/User";
import BonusProgram from "../models/BonusProgram";
declare let attributes: {
    /** ID */
    id: string;
    /**
     * ID transaction in 3d party system
     * */
    externalId: string;
    /** Type of bonuses (default: true)
     * came is incoming (positive transaction)
     * gone is outgoing (negative transaction)
     */
    isNegative: boolean;
    /** Custom badges */
    group: string;
    /** Text */
    comment: string;
    amount: number;
    /** automatic recalculate */
    balanceAfter: number;
    /** User can delete transaction */
    isDeleted: boolean;
    /**
     * Indicates whether the call was made after creation. If so, this means that the bonus adapter worked without errors
     */
    isStable: boolean;
    /** UTC time */
    time: string;
    bonusProgram: BonusProgram | string;
    user: User | string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
interface UserBonusTransaction extends RequiredField<OptionalAll<attributes>, "isNegative" | "bonusProgram" | "user" | "amount">, ORM {
}
export default UserBonusTransaction;
declare let Model: {
    /**
     * Before create, a check is made to see if there are enough funds to write off.
     * Immediately after create saving the transaction in the local database, the external adapter is called to save the transaction
     */
    beforeCreate(init: UserBonusTransaction, cb: (err?: string) => void): Promise<void>;
    afterCreate(record: UserBonusTransaction, cb: (err?: string) => void): Promise<void>;
    beforeDestroy(): never;
    beforeUpdate(record: OptionalAll<UserBonusTransaction>, cb: (err?: string) => void): void;
};
declare global {
    const UserBonusTransaction: typeof Model & ORMModel<UserBonusTransaction, "user" | "amount" | "bonusProgram">;
}
