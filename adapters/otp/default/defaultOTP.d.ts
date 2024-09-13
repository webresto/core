import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
export declare class DefaultOTP extends OneTimePasswordAdapter {
    /**
     * Send and return OTP code
     * Send if delivery channel to user exit, else it delivers to manager, for calling and speech
     * @param login
     * @returns OTP
     */
    get(login: string): Promise<OneTimePassword>;
}
