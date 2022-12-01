import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
    /** Type of bonuses */
    type: string;
    active: {
        type: string;
        defaultsTo: boolean;
    };
    balance: {
        type: string;
        defaultsTo: boolean;
    };
    isDeleted: {
        type: string;
    };
    user: {
        collection: string;
        via: string;
    };
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface UserBonus extends attributes, ORM {
}
export default UserBonus;
declare let Model: {
    beforeCreate(UserBonusInit: any, next: any): void;
};
declare global {
    const UserBonus: typeof Model & ORMModel<UserBonus>;
}
