import { InfoBase } from "adminizer";

export default class TodayOrdersCountWidget extends InfoBase {
	readonly widgetType = "info"

	async getInfo(): Promise<string> {
		const now = new Date();
		
		// Set the correct time zone offset in minutes
		const offsetMinutes = now.getTimezoneOffset();
		
		// Get the start and end of the day in the GSM time zone
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
		const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

		// Adjust for timezone by adding the offset in minutes
		startOfDay.setMinutes(startOfDay.getMinutes() - offsetMinutes);
		endOfDay.setMinutes(endOfDay.getMinutes() - offsetMinutes);

		const todayOrdersCount = await Order.count({
			createdAt: { '>=': startOfDay, '<=': endOfDay }, state: "ORDER"
		});

		return todayOrdersCount + "";
	}

	public icon: string = "notificationsactive";
	readonly id: string = 'order-count'
	readonly department: string = 'restoapp_info'
	readonly description: string = 'Today\'s Orders'
	readonly name: string = 'Order count'
	readonly link: string = '/admin/order-kanban'
	readonly linkType: 'self' | 'blank' = 'self'
	readonly size = {
		h: 1,
		w: 1
	}
}
