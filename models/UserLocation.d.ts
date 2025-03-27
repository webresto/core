import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { StreetRecord } from "./Street";
import { UserRecord } from "./User";
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
    street: StreetRecord | string;
    /**
     * Set as default for specific user
     * */
    isDefault: boolean;
    user: UserRecord | string;
    comment: string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface UserLocationRecord extends attributes, ORM {
}
declare let Model: {
    beforeUpdate(record: UserLocationRecord, cb: (err?: string) => void): any;
    beforeCreate(init: UserLocationRecord, cb: (err?: string) => void): any;
};
declare global {
    const UserLocation: typeof Model & ORMModel<UserLocationRecord, null>;
}
export {};
