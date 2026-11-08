import { InfoBase } from "adminizer";

/** Promo codes switched on. */
export default class PromotionCodesCountWidget extends InfoBase {
	readonly widgetType = "info"

	async getInfo(): Promise<string> {
		return await PromotionCode.count!({ enable: true }) + "";
	}

	public icon: string = "confirmation_number";
	readonly id: string = 'promotion-codes-count'
	readonly department: string = 'Marketing'
	// short words: the marketer's widgets are one cell each, the name and the description in a line
	readonly description: string = 'Those switched on'
	readonly name: string = 'Promo codes'
	readonly size = {
		h: 1,
		w: 1
	}
}
