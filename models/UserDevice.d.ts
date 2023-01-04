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
    loginTime: string;
    lastActivity: string;
    customData: string | {
        [key: string]: string | number | boolean;
    };
};
declare type attributes = typeof attributes;
interface UserDevice extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
export default UserDevice;
declare let Model: {
    beforeUpdate(record: UserDevice, next: Function): void;
    beforeCreate(record: any, next: Function): void;
};
declare global {
    const UserDevice: typeof Model & ORMModel<UserDevice, "lastIP">;
}