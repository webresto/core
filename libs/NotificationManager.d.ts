/**
 * WebPush
 */
import User from "../models/User";
type Badge = 
/** Send OTP */
"OTP" | "Error" | string;
export declare class NotificationManager {
    static kitchenChannels: Function[];
    static userChannels: Function[];
    constructor();
    isChannelExist(channel: string): boolean;
    sendMessageToUser(badge: Badge, user: User, message: string, subject?: string, channel?: string, data?: object): Promise<void>;
    sendMessageToDeliveryManager(badge: Badge, message: string, data?: object): Promise<void>;
    sendMessageToEmployeeGroup(badge: Badge, message: string, data?: object): Promise<void>;
    registerChannel(channelName: string, sortOrder: number, type: "user" | "delivery_manager", handler: (badge: Badge, message: string, subject?: string, user?: User, data?: object) => void): void;
}
export {};
