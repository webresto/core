import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
    active: {
        type: string;
    };
    balance: {
        type: string;
    };
    isDeleted: {
        type: string;
    };
    user: {
        model: string;
    };
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
