"use strict";
/**
 * WebPush
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationManager = void 0;
class NotificationManager {
    constructor() {
    }
    isChannelExist(channel) {
        return true;
    }
    async sendMessageToUser(badge, user, message, subject, channel, data) {
    }
    ;
    // IDEA
    // public async sendMessageToUserGroup(badge: Badge, group: UserGroup, message: string, subject?: string, channel?: string, data?: object): Promise<void> {
    // };
    async sendMessageToDeliveryManager(badge, message, data) {
    }
    ;
    // IDEA
    // public async sendMessageToEmployee(badge: Badge, message: string, data?: object): Promise<void> {
    // };
    async sendMessageToEmployeeGroup(badge, message, data) {
    }
    ;
    registerChannel(channelName, sortOrder, type, handler) {
    }
    ;
}
exports.NotificationManager = NotificationManager;
