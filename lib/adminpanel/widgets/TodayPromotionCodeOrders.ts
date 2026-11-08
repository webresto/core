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
	// short words: the marketer's widgets are one cell each, the name and the description in a line
	readonly description: string = 'Orders today'
	readonly name: string = 'With a promo code'
	readonly size = {
		h: 1,
		w: 1
	}
}
