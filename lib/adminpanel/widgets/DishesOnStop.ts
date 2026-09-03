import { InfoBase } from "adminizer";
import { getEffectiveBalance, getDishPlaceBalanceMode, UNLIMITED_BALANCE } from "../../dish-place-balance";

export default class DishesOnStopWidget extends InfoBase {
	readonly widgetType = "info"

	/**
	 * Counts products limited or stopped at least at one cooking point.
	 *
	 * A product with no `DishPlace` row is unlimited everywhere, so only
	 * existing rows can put a product on stop.
	 */
	async getInfo(): Promise<string> {
		const mode = await getDishPlaceBalanceMode();
		const rows = await DishPlace.find({});

		const limitedProducts = new Set<string>();
		for (const row of rows) {
			const balance = getEffectiveBalance({
				localBalance: row.localBalance,
				rmsBalance: row.rmsBalance,
				enable: row.enable !== false,
				mode,
			});
			if (balance !== UNLIMITED_BALANCE) limitedProducts.add(String(row.dish));
		}

		return limitedProducts.size + "";
	}

	public icon = "block";
	readonly id: string = 'dishes-on-stop'
	readonly department: string = 'restoapp_info'
	readonly description: string = 'Dishes on Stop'
	readonly name: string = 'Dishes on Stop'
	readonly backgroundCSS = '#fb0000ff'
	readonly link: string = '/admin/stock-manager'
	readonly linkType: 'self' | 'blank' = 'self'
	readonly size = {
		h: 1,
		w: 1
	}
}
