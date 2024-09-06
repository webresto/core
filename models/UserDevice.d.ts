import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
declare let attributes: {
    /** ID */
    id: string;
    /** Generated name from an OS type, and location */
    name: string;
    userAgent: string;
    isLoggedIn: boolean;
    user: UserRecord | string;
    lastIP: string;
    loginTime: number;
    lastActivity: number;
    /**  (not jwt-token)  */
    sessionId: string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface UserDeviceRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
declare let Model: {
    beforeUpdate(record: UserDeviceRecord, cb: (err?: string) => void): void;
    /**
     * For each request from user device to core
     */
    afterUpdate(record: UserDeviceRecord, cb: (err?: string) => void): void;
    beforeCreate(record: any, cb: (err?: string) => void): void;
    /** Method set lastActivity for a device */
    setActivity(criteria: CriteriaQuery<UserDeviceRecord>, client?: {
        lastIP?: string;
        userAgent?: string;
    }): Promise<void>;
    checkSession(sessionId: string, userId: string, client?: {
        lastIP?: string;
        userAgent?: string;
    }): Promise<boolean>;
};
declare global {
    const UserDevice: typeof Model & ORMModel<UserDeviceRecord, "lastIP">;
}
export {};
