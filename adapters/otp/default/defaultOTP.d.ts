import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
import OneTimePassword from "../../../models/OneTimePassword";
export declare class DefaultOTP extends OneTimePasswordAdapter {
    /**
     * Send and retrun OTP code
     * Send if delivery channel to user exit, else it delivery to manager, for calling and speech
     * @param login
     * @returns OTP
     */
    get(login: string): Promise<OneTimePassword>;
}
