import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /** ID */
    id: number;
    /**
     * relation by LOGIN_FIELD setting
     */
    login: string;
    password: string;
    expires: number;
};
type attributes = typeof attributes;
interface OneTimePassword extends RequiredField<OptionalAll<attributes>, "login">, ORM {
}
export default OneTimePassword;
declare let Model: {
    beforeCreate(record: any, next: Function): void;
    check(login: string, password: string): Promise<boolean>;
};
declare global {
    const OneTimePassword: typeof Model & ORMModel<OneTimePassword, "login">;
}
