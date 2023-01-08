/**
 * WebPush
 */

import User from "../models/User"
type Badge = 
/** Send OTP */
"OTP" | 
"Error" | string;
export class NotificationManager {

  public static kitchenChannels: Function[];
  public static userChannels: Function[];

  constructor(){

  }

  public isChannelExist(channel: string): boolean {
    return true
  }
  
  public async sendMessageToUser(badge: Badge, user: User, message: string, subject?: string, channel?: string, data?: object): Promise<void> {

  };

  // IDEA
  // public async sendMessageToUserGroup(badge: Badge, group: UserGroup, message: string, subject?: string, channel?: string, data?: object): Promise<void> {

  // };

  public async sendMessageToDeliveryManager(badge: Badge, message: string, data?: object): Promise<void> {

  };

  // IDEA
  // public async sendMessageToEmployee(badge: Badge, message: string, data?: object): Promise<void> {
    
  // };

  public async sendMessageToEmployeeGroup(badge: Badge, message: string, data?: object): Promise<void> {
    
  };

  public registerChannel(channelName: string, sortOrder: number, type: "user" | "delivery_manager", handler: (badge: Badge, message: string, subject?: string, user?: User, data?: object) => void): void {
    
  };

}
