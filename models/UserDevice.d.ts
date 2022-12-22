import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /** ID */
    id: string;
    name: string;
    userAgent: string;
    isActive: boolean;
    user: {
        model: string;
        via: string;
    };
    lastIP: string;
    lastLogin: string;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface UserDevice extends RequiredField<OptionalAll<attributes>, "name" | "userAgent" | "user" | "lastIP" | "lastLogin">, ORM {
}
export default UserDevice;
declare let Model: {
    beforeCreate(UserLocationInit: any, next: any): void;
};
declare global {
    const UserDevice: typeof Model & ORMModel<UserDevice>;
}
