import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { BonusProgramRecord } from "./BonusProgram";
declare let attributes: {
    /** UserBonusProgram ID */
    id: Readonly<string>;
    /** External id for bonus program */
    externalId: string;
    /** id for customer in external program */
    externalCustomerId: string;
    balance: number;
    isDeleted: boolean;
    isActive: boolean;
    user: UserRecord | string;
    bonusProgram: BonusProgramRecord | string;
    /** UNIX era seconds */
    syncedToTime: string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface UserBonusProgramRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(init: UserBonusProgramRecord, cb: (err?: string) => void): void;
    registration(user: UserRecord | string, adapterOrId: string): Promise<UserBonusProgramRecord>;
    delete(user: UserRecord | string, adapterOrId: string): Promise<void>;
    syncAll(user: UserRecord | string): Promise<void>;
    /** Full sync all transaction with external system */
    sync(user: UserRecord | string, bonusProgram: BonusProgramRecord | string, force?: boolean): Promise<void>;
    checkEnoughToSpend(user: UserRecord | string, bonusProgram: BonusProgramRecord | string, amount: number): Promise<boolean>;
    sumCurrentBalance(user: UserRecord | string, bonusProgram: BonusProgramRecord | string): Promise<number>;
};
declare global {
    const UserBonusProgram: typeof Model & ORMModel<UserBonusProgramRecord, "user" | "bonusProgram">;
}
export {};
