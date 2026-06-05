import { InfoBase } from "adminizer";

export default class NotificationsTodayCountWidget extends InfoBase {
	readonly widgetType = "info"

	async getInfo(): Promise<string> {
		// Notification.createdAt is a Unix ms timestamp, so "today" is everything
		// from local midnight onward (mirrors the dashboard's daily buckets).
		const start = new Date();
		start.setHours(0, 0, 0, 0);

		const todayNotificationsCount = await Notification.count({
			createdAt: { ">=": start.getTime() }
		});

		return todayNotificationsCount + "";
	}

	public icon: string = "campaign";
	readonly id: string = 'notifications-today-count'
	readonly department: string = 'restoapp_info'
	readonly description: string = 'Today\'s Notifications'
	readonly name: string = 'Notifications today'
	// Opens the big notifications module on its dashboard section.
	readonly link: string = '/admin/notifications-manager#dashboard'
	readonly linkType: 'self' | 'blank' = 'self'
	readonly size = {
		h: 1,
		w: 1
	}
}
