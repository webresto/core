import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import User from "../models/User";
declare let attributes: {
    /** ID */
    id: string;
    active: {
        type: string;
    };
    balance: number;
    isDeleted: {
        type: string;
    };
    user: string | User;
    BonusProgram: {
        model: string;
    };
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
};
declare global {
    const UserBonusProgram: typeof Model & ORMModel<UserBonusProgram, null>;
}
