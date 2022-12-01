import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID */
    id: string;
    name: string;
    city: string;
    home: string;
    housing: string;
    index: string;
    entrance: string;
    floor: string;
    apartment: string;
    doorphone: string;
    street: string;
    user: {
        model: string;
        via: string;
    };
    comment: string;
    customData: string | {
        [k: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface UserLocation extends attributes, ORM {
}
export default UserLocation;
declare let Model: {
    beforeCreate(UserLocationInit: any, next: any): void;
};
declare global {
    const UserLocation: typeof Model & ORMModel<UserLocation>;
}
