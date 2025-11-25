import { InfoBase } from "adminizer";

export default class DishCountWidget extends InfoBase {
    backgroundCSS: string;
	readonly widgetType = "info"
	async getInfo(): Promise<string> {
		return await Dish.count({isDeleted: false, concept: "origin"})+""
	}

	public icon: string = "modestandby";
	readonly id: string = 'dish-count'
	readonly department: string = 'restoapp_info'
	readonly description: string = 'Dishes'
	readonly name: string = 'Dish count'
	readonly link: string = '/admin/catalog/products';
    readonly linkType: 'self' | 'blank' = 'self';
	readonly size = {
		h: 1,
		w: 1
	}
}
