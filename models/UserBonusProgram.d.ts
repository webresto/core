import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import User from "../models/User";
import BonusProgram from "./BonusProgram";
declare let attributes: {
    /** ID */
    id: string;
    /** External id for bonus program */
    externalId: string;
    /** id for customer in external program */
    externalCustomerId: string;
    balance: number;
    isDeleted: boolean;
    isActive: boolean;
    user: string | User;
    bonusProgram: string | BonusProgram;
    /** UNIX era seconds */
    syncedToTime: string;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface UserBonusProgram extends attributes, ORM {
}
export default UserBonusProgram;
declare let Model: {
    beforeCreate(init: UserBonusProgram, cb: (err?: string) => void): void;
    registration(user: string | User, adapterOrId: string): Promise<UserBonusProgram>;
    delete(user: string | User, adapterOrId: string): Promise<void>;
    syncAll(user: string | User): Promise<void>;
    /** Full sync all transaction with external system */
    sync(user: string | User, bonusProgram: string | BonusProgram, force?: boolean): Promise<void>;
    checkEnoughToSpend(user: string | User, bonusProgram: string | BonusProgram, amount: number): Promise<boolean>;
    sumCurrentBalance(user: string | User, bonusProgram: string | BonusProgram): Promise<number>;
};
declare global {
    const UserBonusProgram: typeof Model & ORMModel<UserBonusProgram, "user" | "bonusProgram">;
}
