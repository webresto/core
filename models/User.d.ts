import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import UserOrderHistory from "./UserOrderHistory";
import UserDevice from "./UserDevice";
import UserLocation from "./UserLocation";
import UserBonusProgram from "../models/UserBonusProgram";
import { OptionalAll } from "../interfaces/toolsTS";
export type Phone = {
    code: string;
    number: string;
    additionalNumber?: string;
};
declare let attributes: {
    /** User model ID */
    id: string;
    login: string;
    firstName: string;
    lastName: string;
    sex: number;
    email: string;
    /**
     * It is a basic login field
     *  type Phone {
          code: string
          number: string
          additionalNumber?: string
        }
     */
    phone: Phone;
    birthday: string;
    favorites: Dish[];
    bonusProgram: UserBonusProgram[];
    history: UserOrderHistory[];
    locations: UserLocation[];
    devices: UserDevice[];
    /**
     *  Has success verification Phone
     */
    verified: boolean;
    /**
     * Indicate filled all required custom fields
     */
    allRequiredCustomFieldsAreFilled: boolean;
    passwordHash: string;
    lastPasswordChange: number;
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
/**
 * @deprecated use `UserRecord` instead
 */
interface User extends OptionalAll<attributes>, ORM {
}
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
    delete(userId: string, OTP: string, force?: boolean): Promise<void>;
    /**
     * Returns phone string by user criteria
     * Additional number will be added separated by commas (+19990000000,1234)
     * @returns String
     * @param phone
     * @param target
     */
    getPhoneString(phone: Phone, target?: "login" | "print" | "string"): Promise<string>;
    /**
     * Update user password
     *
     * @param userId User id
     * @param newPassword New password
     * @param oldPassword Old Password
     * @param force Skip check old password
     * @param temporaryCode
     * @setting PasswordSalt - Password salt (default: number42)
     * @setting PasswordRegex - Checking password by regex (default: no check)
     * @setting PasswordMinLength - Checks minimum length password (default: no check)
     *
     * Note: node -e "console.log(require('bcryptjs').hashSync(process.argv[1], "number42"));" your-password-here
     */
    setPassword(userId: string, newPassword: string, oldPassword: string, force?: boolean, temporaryCode?: string): Promise<User>;
    login(login: string, phone: Phone, deviceId: string, deviceName: string, password: string, OTP: string, userAgent: string, IP: string): Promise<UserDevice>;
    authDevice(userId: string, deviceId: string, deviceName: string, userAgent: string, IP: string): Promise<UserDevice>;
    /**
      check all active bonus programs for user
    */
    checkRegisteredInBonusPrograms(userId: string): Promise<void>;
};
declare global {
    const User: typeof Model & ORMModel<UserRecord, null>;
}
export {};
