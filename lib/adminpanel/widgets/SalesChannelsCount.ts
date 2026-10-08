import { InfoBase } from "adminizer";

export default class SalesChannelsCountWidget extends InfoBase {
	readonly widgetType = "info"

	// Working channels only (enabled + ready + live provider), the same rule as orders and the
	// setup checklist. Stored status: the widget does not call providers.
	async getInfo(): Promise<string> {
		const channels = await SalesChannel.find({ enabled: true });
		return channels.filter((channel) => SalesChannel.isActive(channel)).length + "";
	}

	public icon: string = "storefront";
	readonly id: string = 'sales-channels-count'
	readonly department: string = 'restoapp_info'
	readonly description: string = 'Working sales channels'
	readonly name: string = 'Sales channels'
	readonly link: string = '/admin/sales-channels-manager'
	readonly linkType: 'self' | 'blank' = 'self'
	readonly size = {
		h: 1,
		w: 1
	}
}
