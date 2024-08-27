import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import User from "../models/User";
declare let attributes: {
    /** ID */
    id: string;
    /** Generated name from an OS type, and location */
    name: string;
    userAgent: string;
    isLoggedIn: boolean;
    user: User | string;
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
interface UserDevice extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
export default UserDevice;
declare let Model: {
    beforeUpdate(record: UserDevice, cb: (err?: string) => void): void;
    /**
     * For each request from user device to core
     */
    afterUpdate(record: UserDevice, cb: (err?: string) => void): void;
    beforeCreate(record: any, cb: (err?: string) => void): void;
    /** Method set lastActivity for a device */
    setActivity(criteria: CriteriaQuery<UserDevice>, client?: {
        lastIP?: string;
        userAgent?: string;
    }): Promise<void>;
    checkSession(sessionId: string, userId: string, client?: {
        lastIP?: string;
        userAgent?: string;
    }): Promise<boolean>;
};
declare global {
    const UserDevice: typeof Model & ORMModel<UserDevice, "lastIP">;
}
