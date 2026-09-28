import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { requireStockManagerAccess } from "./access-rights";

export default function StockManagerController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!requireStockManagerAccess(req, res)) return;

  return req.Inertia.render({
    component: 'module',
    props: {
      moduleComponent: adminModuleUrl("StockManager"),
      message: t('Stock Manager'),
      locale,
      messages,
      canManage: true,
    }
  });
}
