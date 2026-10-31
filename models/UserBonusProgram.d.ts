import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { BonusProgramRecord } from "./BonusProgram";
import { UserRecord } from "./User";
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
    /** When the balance was synced last, ISO time; "0" - never */
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
    afterCreate(record: UserBonusProgramRecord, cb: (err?: string) => void): Promise<void>;
    afterUpdate(record: UserBonusProgramRecord, cb: (err?: string) => void): Promise<void>;
    registration(user: UserRecord | string, adapterOrId: string): Promise<UserBonusProgramRecord>;
    /** the user leaves this program: the membership stays as left, so a login does not put them back */
    delete(user: UserRecord | string, adapterOrId: string): Promise<void>;
    /**
     * Syncs every active membership of the user synced longer than TIME_TO_SYNC_BONUSES_IN_MINUTES ago. Called on every
     * request of a logged-in device and not awaited there: it never throws, a failure is only logged.
     */
    syncAll(user: UserRecord | string): Promise<void>;
    sync(user: UserRecord | string, bonusProgram: BonusProgramRecord | string): Promise<void>;
};
declare global {
    const UserBonusProgram: typeof Model & ORMModel<UserBonusProgramRecord, "user" | "bonusProgram">;
}
export {};
