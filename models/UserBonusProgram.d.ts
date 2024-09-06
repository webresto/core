import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { UserRecord } from "../models/User";
import { BonusProgramRecord } from "./BonusProgram";
declare let attributes: {
    /** UserBonusProgram ID */
    id: string;
    /** External id for bonus program */
    externalId: string;
    /** id for customer in external program */
    externalCustomerId: string;
    balance: number;
    isDeleted: boolean;
    isActive: boolean;
    user: string | UserRecord;
    bonusProgram: string | BonusProgramRecord;
    /** UNIX era seconds */
    syncedToTime: string;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
export interface UserBonusProgramRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(init: UserBonusProgramRecord, cb: (err?: string) => void): void;
    registration(user: string | UserRecord, adapterOrId: string): Promise<UserBonusProgramRecord>;
    delete(user: string | UserRecord, adapterOrId: string): Promise<void>;
    syncAll(user: string | UserRecord): Promise<void>;
    /** Full sync all transaction with external system */
    sync(user: string | UserRecord, bonusProgram: string | BonusProgramRecord, force?: boolean): Promise<void>;
    checkEnoughToSpend(user: string | UserRecord, bonusProgram: string | BonusProgramRecord, amount: number): Promise<boolean>;
    sumCurrentBalance(user: string | UserRecord, bonusProgram: string | BonusProgramRecord): Promise<number>;
};
declare global {
    const UserBonusProgram: typeof Model & ORMModel<UserBonusProgramRecord, "user" | "bonusProgram">;
}
export {};
