/**
 * Single source of truth for the adminizer JSX modules of this hook.
 *
 * Adminizer loads every module with a bare `await import(url)` in the browser,
 * so the URL can point anywhere. That gives us two modes:
 *
 *   - default — the files produced by `npm run build:adminizer` and served by
 *     hook/bindAssets.ts from `/restocore/assets/core-adminizer-assets`
 *   - HMR (`npm run dev:hmr` in the app root) — the same entries served straight
 *     from the Vite dev server started next to the app, so edits in the .jsx
 *     sources land in the browser without a rebuild
 *
 * `vite.config.js` reads ENTRIES from here too, so the bundle entries, the dev
 * server routes and the URLs the controllers hand out can never drift apart.
 */

/** Module name → source file, relative to `lib/adminpanel`. */
export const ADMIN_MODULE_ENTRIES = {
  StockManager: "src/stock-manager.jsx",
  OrderLogsViewer: "src/controls/order-logs-viewer.jsx",
  WorktimeViewer: "src/controls/worktime-viewer.jsx",
  ModifiersEditor: "src/controls/modifiers-editor.jsx",
  TagsEditor: "src/controls/tags-editor.jsx",

  OrderKanban: "src/order-kanban.jsx",
  NotificationsManager: "src/notifications-manager.jsx",
  PromoCodesManager: "src/promocodes-manager.jsx",
  PromotionsManager: "src/promotions-manager.jsx",
  OrdersReport: "src/orders-report.jsx",
  SettingsManager: "src/settings-manager.jsx",
  SetupChecklist: "src/setup-checklist.jsx",
  SetupChecklistWidget: "src/setup-checklist-widget.jsx",
  SalesChannelsManager: "src/sales-channels-manager.jsx",
  DeliveryZonesManager: "src/delivery-zones-manager.jsx",
} as const;

export type AdminModuleName = keyof typeof ADMIN_MODULE_ENTRIES;

/** URL prefix the dev server answers module requests on. */
export const ADMIN_HMR_ROUTE_PREFIX = "/@restocore-hmr/";

export const ADMIN_HMR_DEFAULT_PORT = 5174;

const BUILT_ASSETS_BASE = "/restocore/assets/core-adminizer-assets";

export function isAdminHmrEnabled(): boolean {
  const flag = process.env.RESTOCORE_HMR;
  return flag === "1" || flag === "true";
}

export function adminHmrOrigin(): string {
  const origin =
    process.env.RESTOCORE_HMR_ORIGIN ||
    `http://127.0.0.1:${process.env.RESTOCORE_HMR_PORT || ADMIN_HMR_DEFAULT_PORT}`;
  return origin.replace(/\/+$/, "");
}

/**
 * URL for an adminizer module.
 *
 * @param version cache buster appended to the built asset; ignored under HMR,
 *   where the dev server does its own versioning.
 */
export function adminModuleUrl(name: AdminModuleName, version?: string): string {
  if (isAdminHmrEnabled()) {
    return `${adminHmrOrigin()}${ADMIN_HMR_ROUTE_PREFIX}${name}`;
  }
  return `${BUILT_ASSETS_BASE}/${name}.js${version ? `?v=${version}` : ""}`;
}
