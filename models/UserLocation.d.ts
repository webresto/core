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
    street: string | StreetRecord;
    /**
     * Set as default for specific user
     * */
    isDefault: boolean;
    user: string | UserRecord;
    comment: string;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
type attributes = typeof attributes;
export interface UserLocationRecord extends attributes, ORM {
}
declare let Model: {
    beforeUpdate(record: UserLocationRecord, cb: (err?: string) => void): Promise<void>;
    beforeCreate(init: UserLocationRecord, cb: (err?: string) => void): Promise<void>;
};
declare global {
    const UserLocation: typeof Model & ORMModel<UserLocationRecord, null>;
}
export {};
