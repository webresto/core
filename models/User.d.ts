import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import Order from "../models/Order";
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
    bonusProgram: UserBonusProgram;
    history: Order[];
    locations: {
        collection: string;
        via: string;
    };
    devices: {
        collection: string;
        via: string;
    };
    verified: boolean;
    passwordHash: string;
    lastPasswordChange: string;
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
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface User extends OptionalAll<attributes>, ORM {
}
export default User;
declare let Model: {
    beforeCreate(userInit: User, next: Function): void;
    /**
     * Returns phone string by user criteria
     * Additional number will be added separated by commas (+19990000000,1234)
     * @param {WaterlineCriteria} criteria
     * @returns String
     */
    getPhoneString(criteria: any): Promise<string>;
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
    login(login: string, password: string, temporaryCode: string): Promise<void>;
    authDevice(): Promise<void>;
};
declare global {
    const User: typeof Model & ORMModel<User, "firstName" | "phone">;
}
