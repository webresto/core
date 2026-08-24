/**
 * Shares the admin locale and its messages with every Inertia page of the panel.
 *
 * Mounted on the panel root by both admin panel hosts (see `lib/adminpanel/manifest.ts`).
 */
import { getInertiaLocaleAndMessages } from "../controller/i18n-messages";

export default function shareInertiaLocale(req: any, _res: any, next: any): void {
  if (req?.Inertia?.shareProps) {
    const { locale, messages } = getInertiaLocaleAndMessages(req);
    req.Inertia.shareProps({ locale, messages });
  }
  next();
}
