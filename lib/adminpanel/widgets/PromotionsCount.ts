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
	// short words: the marketer's widgets are one cell each, the name and the description in a line
	readonly description: string = 'Those switched on'
	readonly name: string = 'Promotions'
	readonly size = {
		h: 1,
		w: 1
	}
}
