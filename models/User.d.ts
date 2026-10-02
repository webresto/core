import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { UserOrderHistoryRecord } from "./UserOrderHistory";
import { UserDeviceRecord } from "./UserDevice";
import { UserLocationRecord } from "./UserLocation";
import { OptionalAll } from "../interfaces/toolsTS";
import { UserBonusProgramRecord } from "./UserBonusProgram";
import { DishRecord } from "./Dish";
export type Phone = {
    code: string;
    number: string;
    additionalNumber?: string;
};
declare let attributes: {
    /** User model ID — the account key. Nothing else identifies a user (extend_user_account §3.1):
     *  every way in is a row in AuthIdentity, found by (provider, externalId). */
    id: string;
    firstName: string;
    lastName: string;
    sex: number;
    /**
     * A contact address, and nothing more: never a way in, never proven by the core (review3 §1.2).
     * Nullable so it can actually be cleared — `User.delete` wipes it, and Waterline refuses `null`
     * for a string attribute without `allowNull`.
     */
    email: string;
    /**
     * @deprecated Not a login field any more, and not where the user's number lives: a read-only
     * copy of the primary phone-identity (`primaryPhone` → AuthIdentity, provider "phone"), kept
     * only for readers that still expect `user.phone` — bonus/RMS adapters, notifications, the
     * admin panel. Written by AuthService alone (`syncUserProjections`, И13); never set it from
     * anywhere else, and read the number through `primaryPhone` in new code.
     */
    phone: Phone;
    birthday: string;
    favorites: DishRecord[];
    bonusProgram: UserBonusProgramRecord[];
    history: UserOrderHistoryRecord[];
    locations: UserLocationRecord[];
    devices: UserDeviceRecord[];
    /**
     *  Has success verification Phone
     */
    verified: boolean;
    /** External auth accounts linked to this user (telegram / max / vk / phone / …) */
    identities: import("./AuthIdentity").AuthIdentityRecord[];
    /**
     * Which phone-identity is the primary one — a reference, not a flag on AuthIdentity
     * (extend_user_account §3.3): with no transactions in this project, "exactly one row flagged
     * primary" cannot be kept as an invariant across several writes, while a nullable FK on User
     * cannot desync by construction. This is what external bonus/RMS adapters see as `User.phone`,
     * and where security notices about the identity set (§6) are sent.
     */
    primaryPhone: import("./AuthIdentity").AuthIdentityRecord | string | null;
    /**
     * Indicate filled all required custom fields
     */
    allRequiredCustomFieldsAreFilled: boolean;
    /** Its temporary code for authorization */
    temporaryCode: string;
    /**
     * UserGroup (new, best…)
     * Its Idea for making different promo for users
     */
    /** Mark as kitchen worker
     * its idea for making a delivery message for Employers
     * */
    orderCount: number;
    isDeleted: boolean;
    /**
     * Object with filed custom user fields
    */
    customFields: {
        [key: string]: string | boolean | number;
    } | string;
    /**
    * Any data storage for person
    */
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface UserRecord extends OptionalAll<attributes>, ORM {
}
declare let Model: {
    beforeCreate(userInit: UserRecord, cb: (err?: string) => void): Promise<void>;
    afterCreate(record: UserRecord, cb: (err?: string) => void): Promise<void>;
    /**
     * If a favorite dish exists in a favorites collection, it will be deleted. And vice versa
     * @param userId
     * @param dishId
     */
    handleFavoriteDish(userId: string, dishId: string): Promise<void>;
    /**
     * @param ticket one-time result of a `purpose: "verify:delete_account"` AuthAttempt
     *   (design2 §10.3 — "one code, every door" is closed: a code minted for login no longer
     *   opens account deletion).
     */
    delete(userId: string, ticket: string, force?: boolean): Promise<void>;
    /**
     * Returns phone string by user criteria
     * Additional number will be added separated by commas (+19990000000,1234)
     * @returns String
     * @param phone
     * @param target
     */
    getPhoneString(phone: Phone, target?: "login" | "print" | "string"): Promise<string>;
    /**
     * Bind (or rebind) a device to `userId` and open a fresh session. The SAME mechanism every
     * login path ends at — phone, social, ticket exchange — so session issuance is single-sourced
     * (design2 §0). `identityId`, when known, records which identity this session was opened
     * through (extend_user_account §3.4): needed so unlinking that identity can revoke sessions
     * opened via it.
     */
    authDevice(userId: string, deviceId: string, deviceName: string, userAgent: string, IP: string, identityId?: string): Promise<UserDeviceRecord>;
    /**
      check all active bonus programs for user
    */
    checkRegisteredInBonusPrograms(userId: string): Promise<void>;
};
declare global {
    const User: typeof Model & ORMModel<UserRecord, null>;
}
export {};
