export default abstract class NotificationAdapter {
    abstract sendToUser(to: string, message: string, subject?: string, channel?: string): Promise<void>;
    abstract sendToManager(badge: string, message: string): Promise<void>;
}
