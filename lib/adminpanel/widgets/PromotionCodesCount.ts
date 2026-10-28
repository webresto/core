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
	readonly description: string = 'Promo codes switched on'
	readonly name: string = 'Promo code count'
	// two cells: the name in one line, the number in the card
	readonly size = {
		h: 1,
		w: 2
	}
}
