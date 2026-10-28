import { InfoBase } from "adminizer";

/** Promotions switched on, of those the Promotions page lists. */
export default class PromotionsCountWidget extends InfoBase {
	readonly widgetType = "info"

	async getInfo(): Promise<string> {
		return await Promotion.count!({ isDeleted: false, enable: true }) + "";
	}

	public icon: string = "local_offer";
	readonly id: string = 'promotions-count'
	readonly department: string = 'Marketing'
	readonly description: string = 'Promotions switched on'
	readonly name: string = 'Promotion count'
	readonly size = {
		h: 1,
		w: 1
	}
}
