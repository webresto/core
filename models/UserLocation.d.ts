import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import OrderAddress from "../interfaces/OrderAddress";
import { UserRecord } from "./User";
declare let attributes: {
    /**
     * Set as default for specific user
     * */
    isDefault: boolean;
    user: UserRecord | string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
    city?: string;
    coordinate?: import("../interfaces/Geo").AddressPoint | null;
    entrance?: string;
    home?: string;
    formatted: string;
    housing?: string;
    apartment?: string;
    floor?: string;
    doorphone?: string;
    comment?: string;
    /** ID */
    id: string;
    /** What the storefront lists. `formatted` unless given. */
    name: string;
};
type attributes = typeof attributes;
export interface UserLocationRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(init: UserLocationRecord, cb: (err?: string) => void): Promise<void>;
    /**
     * Makes one of the user's locations the default and unsets the rest of theirs.
     *
     * Scoped by the owner in both writes: an id of someone else's location finds
     * nothing and changes nothing, and is refused like an id that does not exist.
     */
    setDefault(user: string, id: string): Promise<UserLocationRecord>;
    /**
     * Keeps an address of the customer, once per line: the address of a placed
     * delivery, or one they add in their profile (`locationCreate`). A line the
     * user already has is left as it is — with its name and whether it is the
     * default. True when the address is new to them.
     */
    remember(user: string, address: OrderAddress): Promise<boolean>;
};
declare global {
    const UserLocation: typeof Model & ORMModel<UserLocationRecord, never>;
}
export {};
