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
    /**
     * Typed notification event for the notifications pipeline. Universal point covering
     * every OTP adapter (they all persist through this model). Detached: a notification
     * problem must not break OTP issuing. The legacy NotificationManager send in the OTP
     * adapter stays as-is until operators migrate to a notification rule for this event.
     * Note: with DEMO_OTP_LOGIN the password may be overridden after create — the demo
     * code then differs from the emitted one; demo-only, acceptable.
     */
    afterCreate(record: OneTimePasswordRecord, cb: (err?: string) => void): void;
    check(login: string, password: string): Promise<boolean>;
};
declare global {
    const OneTimePassword: typeof Model & ORMModel<OneTimePasswordRecord, "login">;
}
export {};
