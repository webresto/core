import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { ADDRESSES_MANAGE_TOKEN, requireToken } from "./access-rights";

/**
 * The form behind the `Addresses from a file` button of the `Address` list.
 *
 * A page and not a dialog because Adminizer's list toolbar takes links: a global
 * list action is an `HrefConfig`, so what the button can do is go somewhere.
 * It is not in the sidebar either — the catalog is reached through its own list,
 * and a second way in would be a second place to keep in step.
 *
 * The cities come with the page rather than from an endpoint of their own: this
 * is the only screen that asks, and it asks once.
 */
export default async function AddressesUploadController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!requireToken(req, res, ADDRESSES_MANAGE_TOKEN)) return;

  const cities = await City.find({ where: { isDeleted: { "!=": true } }, sort: "name ASC" });

  return req.Inertia.render({
    component: "module",
    props: {
      moduleComponent: adminModuleUrl("AddressesUpload"),
      message: t("Addresses from a file"),
      locale,
      messages,
      cities: cities.map((city: any) => ({ id: String(city.id), name: city.name || String(city.id) })),
      listUrl: `${req.adminizer?.config?.routePrefix ?? ""}/model/address`,
    },
  });
}
