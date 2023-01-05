import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
export declare class Waterfall extends OneTimePasswordAdapter {
    get(login: string): Promise<void>;
}
