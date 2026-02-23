import { InfoBase } from "adminizer";

export default class TodayOrdersCountWidget extends InfoBase {
	readonly widgetType = "info"

	async getInfo(): Promise<string> {
		const todayOrderDate = new Date().toDateString();

		const todayOrdersCount = await Order.count({
			state: "ORDER",
			orderDate: { startsWith: todayOrderDate }
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
