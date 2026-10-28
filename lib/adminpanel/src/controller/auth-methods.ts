import { adminModuleUrl } from "../../adminModules";
import { getInertiaLocaleAndMessages } from "./i18n-messages";
import { hasAccess } from "./marketing-helpers";
import { AUTH_METHODS_RIGHT } from "./auth-methods-helpers";

/** The page "Sign-in methods": the buttons and the ways to confirm a phone a customer gets at the login. */
export default function AuthMethodsController(req: any, res: any) {
  const { locale, messages } = getInertiaLocaleAndMessages(req);
  if (!hasAccess(req, res, AUTH_METHODS_RIGHT)) return;

  return req.Inertia.render({
    component: "module",
    props: { moduleComponent: adminModuleUrl("AuthMethods"), locale, messages },
  });
}
