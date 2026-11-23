/**
 * GET …/core/i18n/messages
 * The admin dictionary in the locale of the user, for the core's controls (`src/i18n/admin-messages.js`):
 * they are drawn on the panel's own model forms, and the props of those pages do not carry it.
 * The core's pages get the same dictionary in their props (`i18n-messages.ts`).
 */
import { getInertiaLocaleAndMessages } from "./i18n-messages";

export default function GetAdminMessagesController(req: any, res: any) {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) return res.sendStatus(401);
  return res.json(getInertiaLocaleAndMessages(req).messages);
}
