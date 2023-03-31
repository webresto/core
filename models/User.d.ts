import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import UserOrderHistory from "./UserOrderHistory";
import UserDevice from "./UserDevice";
import UserLocation from "./UserLocation";
import UserBonusProgram from "../models/UserBonusProgram";
import { OptionalAll } from "../interfaces/toolsTS";
export declare type Phone = {
    code: string;
    number: string;
    additionalNumber?: string;
};
declare let attributes: {
    /** ID */
    id: string;
    login: string;
    firstName: string;
    lastName: string;
    email: string;
    /**
     * Its a basic login field
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
     * UserGroup (new, best.... )
     * Its Idea for making different promo for users
     */
    /** Mark as kitchen worker
     * its idea for making delivery message for Employers
     * */
    isDeleted: boolean;
    /**
     * Object with filed custom user fields
    */
    customFields: string | {
        [key: string]: string | number | boolean;
    };
    /**
    * Any data storadge for person
    */
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface User extends OptionalAll<attributes>, ORM {
}
export default User;
declare let Model: {
    beforeCreate(userInit: User, next: Function): Promise<void>;
    afterCreate: (record: any, proceed: any) => any;
    /**
     * If favorite dish exist in fovorites collection, it will be deleted. And vice versa
     * @param userId
     * @param dishId
     */
    handleFavoriteDish(userId: string, dishId: string): Promise<void>;
    delete(userId: string, OTP: string, force: boolean): Promise<void>;
    /**
     * Returns phone string by user criteria
     * Additional number will be added separated by commas (+19990000000,1234)
     * @param {WaterlineCriteria} criteria
     * @returns String
     */
    getPhoneString(phone: Phone, target?: "string" | "login" | "print"): Promise<string>;
    /**
     * Update user password
     *
     * @param userId User id
     * @param newPassword New password
     * @param oldPassword Old Password
     * @param force Skip check old password
     *
     *
     * @setting PasswordSalt - Password salt (default: number42)
     * @setting PasswordRegex - Checking password by regex (default: no check)
     * @setting PasswordMinLength - Checks minimum length password (default: no check)
     *
     * Note: node -e "console.log(require('bcryptjs').hashSync(process.argv[1], "number42"));" your-password-here
     */
    setPassword(userId: string, newPassword: string, oldPassword: string, force?: boolean, temporaryCode?: string): Promise<User>;
    login(login: string, phone: Phone, deviceId: string, deviceName: string, password: string, OTP: string, userAgent: string, IP: string): Promise<UserDevice>;
    authDevice(userId: string, deviceId: string, deviceName: string, userAgent: string, IP: string): Promise<UserDevice>;
};
declare global {
    const User: typeof Model & ORMModel<User, null>;
}
