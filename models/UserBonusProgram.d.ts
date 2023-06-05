import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import User from "../models/User";
<<<<<<< HEAD
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
=======
import BonusProgram from "./BonusProgram";
declare let attributes: {
    /** ID */
    id: string;
    balance: number;
    isDeleted: boolean;
    user: string | User;
    bonusProgram: string | BonusProgram;
>>>>>>> origin/bonuses
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
    beforeCreate(init: UserBonusProgram, cb: (err?: string) => void): void;
    registration(user: string | User, adapterOrId: string): Promise<UserBonusProgram>;
    delete(user: string | User, adapterOrId: string): Promise<void>;
};
declare global {
    const UserBonusProgram: typeof Model & ORMModel<UserBonusProgram, null>;
}
