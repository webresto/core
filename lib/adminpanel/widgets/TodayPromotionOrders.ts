import { InfoBase } from "adminizer";
import type { OrderRecord } from "../../../models/Order";
import { isPromotionCodeNotice } from "../../promotion-code";

/**
 * Orders placed today where a promotion applied, by itself or through the order's code; today as the Today's Orders
 * widget reads it. The entries that only tell about the code (it gives nothing now, it sets promotions aside) are not
 * promotions that applied.
 */
export default class TodayPromotionOrdersWidget extends InfoBase {
	readonly widgetType = "info"

	async getInfo(): Promise<string> {
		const orders: OrderRecord[] = await Order.find!({ state: "ORDER", orderDate: { startsWith: new Date().toDateString() } });

		return orders.filter((order) => (order.promotionState ?? []).some((state) => !isPromotionCodeNotice(state))).length + "";
	}

	public icon: string = "local_offer";
	readonly id: string = 'promotion-orders-today'
	readonly department: string = 'Marketing'
	// short words: the marketer's widgets are one cell each, the name and the description in a line
	readonly description: string = 'Orders today'
	readonly name: string = 'With a promotion'
	readonly size = {
		h: 1,
		w: 1
	}
}
