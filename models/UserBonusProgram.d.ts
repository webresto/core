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
    registration(user: User | string, adapterOrId: string): Promise<UserBonusProgram>;
    delete(user: User | string, adapterOrId: string): Promise<void>;
    syncAll(user: User | string): Promise<void>;
    /** Full sync all transaction with external system */
    sync(user: User | string, bonusProgram: BonusProgram | string, force?: boolean): Promise<void>;
    checkEnoughToSpend(user: User | string, bonusProgram: BonusProgram | string, amount: number): Promise<boolean>;
    sumCurrentBalance(user: User | string, bonusProgram: BonusProgram | string): Promise<number>;
};
declare global {
    const UserBonusProgram: typeof Model & ORMModel<UserBonusProgram, "user" | "bonusProgram">;
}
