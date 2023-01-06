export default abstract class NotificationAdapter {
  public abstract sendToUser(to: string, message: string, subject?: string, channel?: string): Promise<void>;

  public abstract sendToManager(badge: string, message: string): Promise<void>;
}
