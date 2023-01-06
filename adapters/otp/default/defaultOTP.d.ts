import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
export declare class DefaultOTP extends OneTimePasswordAdapter {
    get(login: string): Promise<void>;
}
