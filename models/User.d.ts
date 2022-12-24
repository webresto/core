import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "../models/Dish";
import Order from "../models/Order";
import UserBonusProgram from "../models/UserBonusProgram";
declare let attributes: {
    /** ID */
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthday: string;
    passwordHash: string;
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
    isDeleted: boolean;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface User extends attributes, ORM {
}
export default User;
declare let Model: {
    beforeCreate(userInit: any, next: any): void;
};
declare global {
    const User: typeof Model & ORMModel<User>;
}
