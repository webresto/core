import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /** ID */
    id: number;
    /**
     * relation by CORE_LOGIN_FIELD setting
     */
    login: string;
    password: string;
    expires: number;
};
type attributes = typeof attributes;
export interface OneTimePasswordRecord extends RequiredField<OptionalAll<attributes>, "login">, ORM {
}
declare let Model: {
    beforeCreate(record: OneTimePasswordRecord, cb: (err?: string) => void): void;
    check(login: string, password: string): Promise<boolean>;
};
declare global {
    const OneTimePassword: typeof Model & ORMModel<OneTimePasswordRecord, "login">;
}
export {};
