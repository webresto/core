import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import OrderAddress from "../interfaces/OrderAddress";
import { UserRecord } from "./User";
declare let attributes: {
    formatted: string;
    city?: string;
    home?: string;
    housing?: string;
    apartment?: string;
    entrance?: string;
    floor?: string;
    doorphone?: string;
    comment?: string;
    coordinate?: import("../adapters/geo/address").AddressPoint | null;
    /** ID */
    id: string;
    /** What the storefront lists. `formatted` unless given. */
    name: string;
    /**
     * Set as default for specific user
     * */
    isDefault: boolean;
    user: UserRecord | string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface UserLocationRecord extends attributes, ORM {
}
declare let Model: {
    beforeUpdate(record: UserLocationRecord, cb: (err?: string) => void): Promise<void>;
    beforeCreate(init: UserLocationRecord, cb: (err?: string) => void): Promise<void>;
    /**
     * Keeps the address of a delivered order, once per line.
     *
     * The only way a location is written: the customer's own deliveries are the
     * list, there is no separate "save this address". A line the user already
     * has is left as it is — with its name and whether it is the default.
     */
    remember(user: string, address: OrderAddress): Promise<void>;
};
declare global {
    const UserLocation: typeof Model & ORMModel<UserLocationRecord, never>;
}
export {};
