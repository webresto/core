import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import User from "../models/User";
import BonusProgram from "./BonusProgram";
declare let attributes: {
    /** ID */
    id: string;
    active: boolean;
    balance: number;
    isDeleted: boolean;
    user: string | User;
    bonusProgram: string | BonusProgram;
    /** UNIX era seconds */
    syncedToTime: string;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface UserBonusProgram extends attributes, ORM {
}
export default UserBonusProgram;
declare let Model: {
    beforeCreate(UserBonusInit: any, next: any): void;
    registration(user: User, adapterOrId: string): Promise<UserBonusProgram>;
};
declare global {
    const UserBonusProgram: typeof Model & ORMModel<UserBonusProgram, null>;
}
