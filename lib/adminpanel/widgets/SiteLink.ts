import { LinkBase, Links } from "adminizer";

/** The site from the dashboard, in a new tab: the marketer's way to it, as the menu's Preview is the catalog's. */
export default class SiteLinkWidget extends LinkBase {
	readonly widgetType = "link"
	readonly links: Links[] = [{ name: "Site", description: "Open the site", icon: "web", link: "/", linkType: "blank", backgroundCSS: null }];

	async getLinks(): Promise<Links[]> {
		return this.links;
	}

	public icon: string = "web";
	readonly id: string = 'site-link'
	readonly department: string = 'Marketing'
	readonly description: string = 'Open the site'
	readonly name: string = 'Site'
	readonly size = {
		h: 1,
		w: 1
	}
}
