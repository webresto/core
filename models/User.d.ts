import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import Order from "../models/Order";
import UserBonusProgram from "../models/UserBonusProgram";
import { OptionalAll } from "../interfaces/toolsTS";
declare type Phone = {
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
        {
          code: String!
          number: String!
          additionalNumber: String
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
    lastActive: string;
    passwordHash: string;
    lastPasswordChange: string;
    /** Its temporary code for authorization */
    temporaryCode: string;
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
};
declare global {
    const User: typeof Model & ORMModel<User, "id" | "firstName" | "phone">;
}
