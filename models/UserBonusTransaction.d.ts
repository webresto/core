import ORM from "../interfaces/ORM";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import ORMModel from "../interfaces/ORMModel";
import User from "../models/User";
import { BonusTransactionType } from "../libs/enums/BonusTransactionType";
declare let attributes: {
    /** ID */
    id: string;
    /** Type of bonuses
    * came is incoming (positive transaction)
    * gone is outgoin (negative transaction)
    */
    type: BonusTransactionType;
    /** Custom badges */
    group: string;
    /**
     * binary sign of transaction type
     */
    isPositive: boolean;
    amount: number;
    balanceAfter: number;
    isDeleted: boolean;
    user: User;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface UserBonusTransaction extends RequiredField<OptionalAll<attributes>, "id">, ORM {
}
export default UserBonusTransaction;
declare let Model: {
    beforeCreate(UserBonusTransactionInit: any, next: any): void;
};
declare global {
    const UserBonusTransaction: typeof Model & ORMModel<UserBonusTransaction, "id">;
}
