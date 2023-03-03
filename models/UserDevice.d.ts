import ORM from "../interfaces/ORM";
import ORMModel, { CriteriaQuery } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import User from "../models/User";
declare let attributes: {
    /** ID */
    id: string;
    /** Generated name from OS type, and location */
    name: string;
    userAgent: string;
    isLogined: boolean;
    user: String | User;
    lastIP: string;
    loginTime: number;
    lastActivity: number;
    /**  (not jwt-token)  */
    sessionId: string;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface UserDevice extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
export default UserDevice;
declare let Model: {
    beforeUpdate(record: UserDevice, next: Function): void;
    beforeCreate(record: any, next: Function): void;
    /** Method set lastActiity  for device */
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
