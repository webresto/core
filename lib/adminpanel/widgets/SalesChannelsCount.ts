import { InfoBase } from "adminizer";

export default class SalesChannelsCountWidget extends InfoBase {
	readonly widgetType = "info"

	async getInfo(): Promise<string> {
		const count = await SalesChannel.count();
		return count + "";
	}

	public icon: string = "storefront";
	readonly id: string = 'sales-channels-count'
	readonly department: string = 'restoapp_info'
	readonly description: string = 'Configured sales channels'
	readonly name: string = 'Sales channels'
	readonly link: string = '/admin/sales-channels-manager'
	readonly linkType: 'self' | 'blank' = 'self'
	readonly size = {
		h: 1,
		w: 1
	}
}
