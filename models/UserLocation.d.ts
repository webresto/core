import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import User from "../models/User";
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
    user: string | User;
    comment: string;
    customData: string | {
        [key: string]: string | number | boolean;
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
    const UserLocation: typeof Model & ORMModel<UserLocation, null>;
}
