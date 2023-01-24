import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
import OneTimePassword from "../../../models/OneTimePassword";
export declare class DefaultOTP extends OneTimePasswordAdapter {
    get(login: string): Promise<OneTimePassword>;
}
