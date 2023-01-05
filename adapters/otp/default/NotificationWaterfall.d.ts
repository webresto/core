import OneTimePasswordAdapter from "../OneTimePasswordAdapter";
export declare class NotificationWaterfall extends OneTimePasswordAdapter {
    get(login: string): Promise<void>;
}
