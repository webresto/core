import { InfoBase } from "adminizer";

export default class DishesOnStopWidget extends InfoBase {
	readonly widgetType = "info"
	
	async getInfo(): Promise<string> {
		const count = await Dish.count({
			isDeleted: false,
			balance: { '!=': -1 }
		});
		return count + "";
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
