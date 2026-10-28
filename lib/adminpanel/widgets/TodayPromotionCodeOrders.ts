import { InfoBase } from "adminizer";

/** Orders placed today with a promo code applied; today as the Today's Orders widget reads it. */
export default class TodayPromotionCodeOrdersWidget extends InfoBase {
	readonly widgetType = "info"

	async getInfo(): Promise<string> {
		return await Order.count!({
			state: "ORDER",
			orderDate: { startsWith: new Date().toDateString() },
			promotionCode: { "!=": null }
		} as any) + "";
	}

	public icon: string = "confirmation_number";
	readonly id: string = 'promotion-code-orders-today'
	readonly department: string = 'Marketing'
	readonly description: string = 'Today\'s orders with a promo code'
	readonly name: string = 'Promo code orders'
	// two cells: the name in one line, the number in the card
	readonly size = {
		h: 1,
		w: 2
	}
}
