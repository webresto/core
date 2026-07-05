import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { getSalesChannelPermissions, hasAccess } from "./sales-channels-helpers";

export default function SalesChannelsManagerController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!hasAccess(req, res)) return;
  const permissions = getSalesChannelPermissions(req);

  return req.Inertia.render({
    component: "module",
    props: {
      moduleComponent: `/restocore/assets/core-adminizer-assets/SalesChannelsManager.js?v=20260623-1`,
      message: t("Sales Channels"),
      locale,
      messages,
      permissions,
      canManage: permissions.canManage,
    },
  });
}
