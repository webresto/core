import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import User from "../models/User";
import Street from "./Street";
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
    street: string | Street;
    /**
     * Set as default for specific user
     * */
    isDefault: boolean;
    user: string | User;
    comment: string;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
interface UserLocation extends attributes, ORM {
}
export default UserLocation;
declare let Model: {
    beforeUpdate(record: UserLocation, cb: (err?: string) => void): Promise<void>;
    beforeCreate(init: UserLocation, cb: (err?: string) => void): Promise<void>;
};
declare global {
    const UserLocation: typeof Model & ORMModel<UserLocation, null>;
}
