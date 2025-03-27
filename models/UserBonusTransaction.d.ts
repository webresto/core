import ORM from "../interfaces/ORM";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { ORMModel } from "../interfaces/ORMModel";
import { BonusProgramRecord } from "./BonusProgram";
import { UserRecord } from "./User";
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
    /** User can delete transaction */
    isDeleted: boolean;
    /**
     * Indicates whether the call was made after creation. If so, this means that the bonus adapter worked without errors
     */
    isStable: boolean;
    /**
     * Indicates that the transaction was canceled
     */
    canceled: boolean;
    /** UTC time */
    time: string;
    bonusProgram: BonusProgramRecord | string;
    user: UserRecord | string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface UserBonusTransactionRecord extends RequiredField<OptionalAll<attributes>, "isNegative" | "bonusProgram" | "user" | "amount">, ORM {
}
declare let Model: {
    /**
     * Before create, a check is made to see if there are enough funds to write off.
     * Immediately after create saving the transaction in the local database, the external adapter is called to save the transaction
     */
    beforeCreate(init: UserBonusTransactionRecord, cb: (err?: string) => void): unknown;
    afterCreate(record: UserBonusTransactionRecord, cb: (err?: string) => void): unknown;
    beforeUpdate(record: OptionalAll<UserBonusTransactionRecord>, cb: (err?: string) => void): void;
    sync(user: UserRecord | string, bonusProgram: BonusProgramRecord | string, balanceOnly?: boolean): Promise<void>;
};
declare global {
    const UserBonusTransaction: typeof Model & ORMModel<UserBonusTransactionRecord, "user" | "amount" | "bonusProgram">;
}
export {};
