/**
 * Everything the core contributes to an admin panel, as data.
 *
 * `hook/bindAdminpanel.ts` used to hold this list as executable code: 79 `adminizer.app.*`
 * calls interleaved with `try/catch`, readable only by running it. That shape ties the list to
 * one host — sails-adminpanel, reached through Sails events — while the same core now also runs
 * outside Sails, where Adminizer offers a first-class app API
 * (`adminizer.appManager.enable()`, see adminizer's docs/BuildingModules.md).
 *
 * So the list lives here, and the hosts consume it:
 *
 *   - `hook/bindAdminpanel.ts` binds it the Sails way (unchanged behaviour: same routes, same
 *     order, same event timing);
 *   - a NodeKnit host declares the same entries through `AppSetupContext`.
 *
 * Two hosts, one source. A module added here shows up in both without touching either binder.
 *
 * The module is plain data and safe to import without Sails: nothing here touches `sails`,
 * models or the panel. Controllers are named by path and loaded on demand through
 * `loadAdminPanelModule()`, so importing the manifest does not pull in the controller graph.
 */
import * as path from "path";
import { checkStockManagerToken } from "../stock-manager-rights";

/** Route under the admin panel's route prefix, e.g. `/stock-manager`. */
export type AdminPanelRoutePath = string;

export interface AdminPanelPage {
  /** Sidebar entry id, also the module's access rights token in most modules. */
  id: string;
  title: string;
  route: AdminPanelRoutePath;
  icon: string;
  section: string;
  /** Token the page is gated by. Pages without one are open to any admin user. */
  accessRightsToken?: string;
  /** Controller path, relative to this directory. */
  controller: string;
}

export interface AdminPanelRoute {
  method: "get" | "post";
  route: AdminPanelRoutePath;
  /** Controller path, relative to this directory. */
  controller: string;
}

/**
 * A feature of the admin panel: at most one page plus the API endpoints behind it.
 *
 * Grouping matters for the Sails binder, which keeps one `try/catch` per module — a broken
 * module drops out without taking the rest of the panel with it.
 */
export interface AdminPanelModule {
  id: string;
  page?: AdminPanelPage;
  routes?: AdminPanelRoute[];
  /**
   * Whether this module belongs in the panel of this installation at all.
   *
   * Answered once per boot and only by modules that depend on something the
   * operator can switch off elsewhere. Absent means always. Loaded lazily
   * inside the function, the way controllers are, so the manifest stays
   * importable without Sails.
   */
  available?: () => Promise<boolean>;
}

/** Middleware mounted on a route prefix (`app.use`), not on an exact path. */
export interface AdminPanelMiddleware {
  id: string;
  /** Prefix under the admin panel route prefix; `""` means the panel root. */
  route: string;
  /** Middleware path, relative to this directory. */
  handler: string;
}

/** One option a contextual token can be granted on — for Stock Manager, a cooking point. */
export interface AdminPanelAccessTokenOption {
  id: string;
  name: string;
  description?: string;
}

export interface AdminPanelAccessToken {
  id: string;
  name: string;
  description: string;
  department: string;
  /**
   * Contextual tokens only: `getOptions` fills the list the group editor shows next to the
   * checkbox, `check` reads back what that group was granted. Both run at request time, so a
   * token that queries a model does not make the manifest need Sails at import.
   */
  getOptions?: (user: unknown) => Promise<AdminPanelAccessTokenOption[]>;
  check?: (user: unknown, context?: { rights?: string[]; [key: string]: unknown }) => boolean | Promise<boolean>;
}

export interface AdminPanelNavbarLink {
  id: string;
  title: string;
  /**
   * `admin` links are relative to the panel's route prefix, `absolute` links are taken as
   * written — they leave the panel (the storefront preview).
   */
  linkType: "admin" | "absolute";
  link: string;
  icon: string;
  section: string;
  accessRightsToken?: string;
}

export interface AdminPanelWidget {
  id: string;
  /** Widget class path, relative to this directory. Default-exported. */
  module: string;
  /** Custom (React) widgets take the panel's route prefix; info widgets take nothing. */
  needsRoutePrefix?: boolean;
}

export interface AdminPanelControl {
  name: string;
  type: "jsonEditor";
  /** Control class path, relative to this directory. */
  module: string;
  /** Exported class name. */
  export: string;
  /** Built component, relative to `adminPanelAssetsDir`. */
  asset: string;
}

/** Prefix middlewares, applied before the module routes. */
export const adminPanelMiddlewares: AdminPanelMiddleware[] = [
  // Admin API responses must not be cached by the browser or a proxy in front of it.
  { id: "core-no-store", route: "/core", handler: "src/middleware/no-store" },
  // Inertia pages read the admin locale from shared props.
  { id: "inertia-locale", route: "", handler: "src/middleware/inertia-locale" },
];

export const adminPanelModules: AdminPanelModule[] = [
  {
    id: "stock-manager",
    page: {
      id: "stock-manager",
      title: "Stock Manager",
      route: "/stock-manager",
      icon: "warehouse",
      accessRightsToken: "stock-manager",
      section: "Catalog",
      controller: "src/controller/stock-manager",
    },
    routes: [
      { method: "get", route: "/core/api", controller: "src/controller/search" },
      { method: "post", route: "/core/update-stock", controller: "src/controller/update-stock" },
      { method: "get", route: "/core/stock-items", controller: "src/controller/get-stock-items" },
      // Multi-kitchen: the points visible here follow the contextual token, and a
      // dish can be switched off at one point without touching its stock.
      { method: "get", route: "/core/stock-places", controller: "src/controller/get-stock-places" },
      { method: "post", route: "/core/update-dish-place-enable", controller: "src/controller/update-dish-place-enable" },
      { method: "get", route: "/core/groups", controller: "src/controller/get-groups" },
      { method: "get", route: "/core/dishes-by-group", controller: "src/controller/get-dishes-by-group" },
      { method: "post", route: "/core/update-visibility", controller: "src/controller/update-visibility" },
      { method: "post", route: "/core/update-is-deleted", controller: "src/controller/update-is-deleted" },
    ],
  },
  {
    id: "order-kanban",
    page: {
      id: "order-kanban",
      title: "Current Orders",
      route: "/order-kanban",
      icon: "view_kanban",
      accessRightsToken: "order-kanban",
      section: "Orders",
      controller: "src/controller/order-kanban",
    },
    routes: [
      { method: "get", route: "/core/order-kanban/orders", controller: "src/controller/get-order-kanban-orders" },
      { method: "get", route: "/core/order-kanban/order", controller: "src/controller/get-order-kanban-order" },
      { method: "get", route: "/core/order-kanban/stream", controller: "src/controller/order-kanban-stream" },
      { method: "post", route: "/core/order-kanban/state", controller: "src/controller/update-order-kanban-state" },
    ],
  },
  {
    id: "notifications-manager",
    page: {
      id: "notifications-manager",
      title: "Notifications",
      route: "/notifications-manager",
      icon: "notifications",
      accessRightsToken: "notifications-manager-view",
      section: "Notifications",
      controller: "src/controller/notifications-manager",
    },
    routes: [
      { method: "get", route: "/core/notifications-manager/notifications", controller: "src/controller/get-notifications" },
      { method: "get", route: "/core/notifications-manager/stats", controller: "src/controller/get-notification-stats" },
      { method: "get", route: "/core/notifications-manager/notification", controller: "src/controller/get-notification" },
      { method: "post", route: "/core/notifications-manager/retry", controller: "src/controller/retry-notification" },
      { method: "get", route: "/core/notifications-manager/users", controller: "src/controller/search-notification-users" },
      { method: "post", route: "/core/notifications-manager/create", controller: "src/controller/create-notification" },
      { method: "get", route: "/core/notifications-manager/channels", controller: "src/controller/get-notification-channels" },
      { method: "post", route: "/core/notifications-manager/channel-settings", controller: "src/controller/update-notification-channel-settings" },
      { method: "get", route: "/core/notifications-manager/types", controller: "src/controller/get-notification-types" },
      { method: "get", route: "/core/notifications-manager/type", controller: "src/controller/get-notification-type" },
      { method: "post", route: "/core/notifications-manager/type", controller: "src/controller/upsert-notification-type" },
      { method: "post", route: "/core/notifications-manager/type-delete", controller: "src/controller/delete-notification-type" },
      { method: "get", route: "/core/notifications-manager/events", controller: "src/controller/get-notification-events" },
      { method: "post", route: "/core/notifications-manager/emit-test", controller: "src/controller/emit-test-notification" },
      { method: "get", route: "/core/notifications-manager/locales", controller: "src/controller/get-notification-locales" },
    ],
  },
  {
    id: "notification-channels",
    page: {
      id: "notification-channels",
      title: "Notification channels",
      route: "/notification-channels",
      icon: "settings_input_component",
      accessRightsToken: "notifications-manager-view",
      section: "Notifications",
      controller: "src/controller/notification-channels",
    },
  },
  {
    id: "promocodes-manager",
    page: {
      id: "promocodes-manager",
      title: "Promo codes",
      route: "/promocodes-manager",
      icon: "confirmation_number",
      accessRightsToken: "promocodes-manager",
      section: "Marketing",
      controller: "src/controller/promocodes-manager",
    },
    routes: [
      { method: "get", route: "/core/marketing/promocodes", controller: "src/controller/get-promocodes" },
      { method: "get", route: "/core/marketing/promocodes/stats", controller: "src/controller/get-promocodes-stats" },
      { method: "get", route: "/core/marketing/promocodes/activity", controller: "src/controller/get-promocodes-activity" },
      { method: "get", route: "/core/marketing/promocodes/generate-code", controller: "src/controller/generate-promocode" },
      { method: "get", route: "/core/marketing/promocode", controller: "src/controller/get-promocode" },
      { method: "post", route: "/core/marketing/promocode", controller: "src/controller/upsert-promocode" },
      { method: "post", route: "/core/marketing/promocode-delete", controller: "src/controller/delete-promocode" },
      { method: "get", route: "/core/marketing/promotions-options", controller: "src/controller/get-promotions-options" },
    ],
  },
  {
    id: "promotions-manager",
    page: {
      id: "promotions-manager",
      title: "Promotions",
      route: "/promotions-manager",
      icon: "local_offer",
      accessRightsToken: "promotions-manager",
      section: "Marketing",
      controller: "src/controller/promotions-manager",
    },
    routes: [
      { method: "get", route: "/core/marketing/promotions", controller: "src/controller/get-marketing-promotions" },
      { method: "get", route: "/core/marketing/promotion", controller: "src/controller/get-marketing-promotion" },
      { method: "post", route: "/core/marketing/promotion", controller: "src/controller/upsert-marketing-promotion" },
      { method: "post", route: "/core/marketing/promotion-toggle", controller: "src/controller/toggle-marketing-promotion" },
      { method: "post", route: "/core/marketing/promotion-delete", controller: "src/controller/delete-marketing-promotion" },
      { method: "get", route: "/core/marketing/concepts", controller: "src/controller/get-marketing-concepts" },
      { method: "get", route: "/core/marketing/groups", controller: "src/controller/get-marketing-groups" },
      { method: "get", route: "/core/marketing/dishes", controller: "src/controller/get-marketing-dishes" },
    ],
  },
  {
    id: "settings-manager",
    page: {
      id: "settings-manager",
      title: "Settings",
      route: "/settings-manager",
      icon: "settings",
      section: "System",
      controller: "src/controller/settings-manager",
    },
    routes: [
      { method: "get", route: "/core/settings-manager/list", controller: "src/controller/get-settings" },
      { method: "post", route: "/core/settings-manager/update/:key", controller: "src/controller/update-setting" },
      { method: "get", route: "/core/settings-manager/export", controller: "src/controller/export-settings" },
      { method: "post", route: "/core/settings-manager/import", controller: "src/controller/import-settings" },
    ],
  },
  {
    id: "setup-checklist",
    page: {
      id: "setup-checklist",
      title: "Setup checklist",
      route: "/setup-checklist",
      icon: "checklist",
      accessRightsToken: "setup-checklist",
      section: "System",
      controller: "src/controller/setup-checklist",
    },
    routes: [
      { method: "get", route: "/core/setup-checklist/status", controller: "src/controller/get-setup-checklist-status" },
      { method: "get", route: "/core/setup-checklist/summary", controller: "src/controller/get-setup-checklist-summary" },
      { method: "post", route: "/core/setup-checklist/dismiss", controller: "src/controller/dismiss-setup-checkup" },
      { method: "post", route: "/core/setup-checklist/restore", controller: "src/controller/restore-setup-checkup" },
    ],
  },
  {
    id: "orders-report",
    page: {
      id: "orders-report",
      title: "Orders Report",
      route: "/orders-report",
      icon: "bar_chart",
      accessRightsToken: "orders-report",
      section: "Reports",
      controller: "src/controller/orders-report",
    },
    routes: [
      { method: "get", route: "/core/orders-report/data", controller: "src/controller/get-orders-report-data" },
    ],
  },
  {
    id: "sales-channels-manager",
    page: {
      id: "sales-channels-manager",
      title: "Sales Channels",
      route: "/sales-channels-manager",
      icon: "storefront",
      accessRightsToken: "sales-channels-view",
      section: "Store",
      controller: "src/controller/sales-channels-manager",
    },
    routes: [
      { method: "get", route: "/core/sales-channels", controller: "src/controller/get-sales-channels" },
      { method: "get", route: "/core/sales-channels/types", controller: "src/controller/get-sales-channel-types" },
      { method: "get", route: "/core/sales-channels/recommendations", controller: "src/controller/get-sales-channel-recommendations" },
      { method: "get", route: "/core/sales-channels/concepts", controller: "src/controller/get-sales-channel-concepts" },
      { method: "get", route: "/core/sales-channel", controller: "src/controller/get-sales-channel" },
      { method: "post", route: "/core/sales-channel", controller: "src/controller/upsert-sales-channel" },
      { method: "post", route: "/core/sales-channel-toggle", controller: "src/controller/toggle-sales-channel" },
      { method: "post", route: "/core/sales-channel-delete", controller: "src/controller/delete-sales-channel" },
    ],
  },
  {
    // Data behind the modifiers-editor control: category and dish pickers plus the option
    // photo upload. No page of its own; gated inside the controllers by `catalog-products`.
    id: "modifiers-editor",
    routes: [
      { method: "get", route: "/core/modifiers/groups", controller: "src/controller/get-modifier-groups" },
      { method: "get", route: "/core/modifiers/dishes", controller: "src/controller/get-modifier-dishes" },
      { method: "post", route: "/core/modifiers/dish-image", controller: "src/controller/upload-modifier-dish-image" },
    ],
  },
  {
    // Autocomplete of tag names already used in the catalog, behind the tags-editor control.
    id: "tags-editor",
    routes: [
      { method: "get", route: "/core/tags", controller: "src/controller/get-dish-tags" },
    ],
  },
  {
    // The only CRUD surface for `DeliveryZone`. The model is deliberately not
    // registered with Adminizer — see the comment on `models/DeliveryZone.ts`.
    id: "delivery-zones-manager",
    // `DeliveryZone` is the default adapter’s model. Point delivery at another
    // adapter and these polygons are a map nothing reads, so the page goes.
    available: () => require("../../adapters").Delivery.isDefault(),
    page: {
      id: "delivery-zones-manager",
      title: "Delivery zones",
      route: "/delivery-zones-manager",
      icon: "map",
      accessRightsToken: "delivery-zones-view",
      section: "Store",
      controller: "src/controller/delivery-zones-manager",
    },
    routes: [
      { method: "get", route: "/core/delivery-zones", controller: "src/controller/get-delivery-zones" },
      { method: "post", route: "/core/delivery-zone", controller: "src/controller/upsert-delivery-zone" },
      { method: "post", route: "/core/delivery-zone-delete", controller: "src/controller/delete-delivery-zone" },
      // The gear next to the city: the map link and how often it is re-read.
      { method: "get", route: "/core/delivery-zone-source", controller: "src/controller/get-delivery-zone-source" },
      { method: "post", route: "/core/delivery-zone-source", controller: "src/controller/set-delivery-zone-source" },
    ],
  },
];

/** Module whose page the panel root redirects to. */
export const adminPanelDefaultModule = "order-kanban";

/**
 * Access rights tokens owned by the core.
 *
 * `catalog-products` is here; the per-catalog `catalog-products-<id>` tokens are not — they are
 * derived from the catalog contents at bind time.
 */
export const adminPanelAccessTokens: AdminPanelAccessToken[] = [
  { id: "catalog-products", name: "Product catalog", description: "Access to edit catalog for products", department: "Catalog" },
  // Contextual: the group picks the cooking points it may see, the token alone only opens the page.
  {
    id: "stock-manager",
    name: "Stock Manager",
    description: "View and change stock for selected cooking points",
    department: "Catalog",
    getOptions: async () => {
      const places = await Place.find({ where: { isCookingPoint: true, enable: true }, sort: "title ASC" });
      return places.map((place: any) => ({
        id: String(place.id),
        name: place.title || String(place.id),
        description: place.address || undefined,
      }));
    },
    check: checkStockManagerToken,
  },
  { id: "order-kanban", name: "Current Orders", description: "Access to Current Orders module and its API endpoints", department: "Orders" },
  { id: "ai-assistant-openharness", name: "RestoApp Assistant", description: "Use the streaming RestoApp Assistant data agent", department: "AI assistant" },
  { id: "globaly-operator-can-create", name: "Operator can create", description: "Global operator create permission for modules that explicitly require this token", department: "Global role permissions" },
  { id: "globaly-operator-can-view", name: "Operator can view", description: "Global operator view permission for modules that explicitly require this token", department: "Global role permissions" },
  { id: "globaly-operator-can-write", name: "Operator can write", description: "Global operator write permission for modules that explicitly require this token", department: "Global role permissions" },
  { id: "globaly-operator-can-delete", name: "Operator can delete", description: "Global operator delete permission for modules that explicitly require this token", department: "Global role permissions" },
  { id: "notifications-manager", name: "Notifications", description: "Legacy full access to Notifications module and its API endpoints", department: "Notifications" },
  { id: "notifications-manager-view", name: "Notifications view", description: "Read-only access to Notifications module", department: "Notifications" },
  { id: "notifications-manager-manage", name: "Notifications manage", description: "Access to manage Notifications module settings and write operations", department: "Notifications" },
  { id: "promocodes-manager", name: "Promo codes", description: "Access to the Promo codes module and its API endpoints", department: "Marketing" },
  { id: "promotions-manager", name: "Promotions", description: "Access to the Promotions module and its API endpoints", department: "Marketing" },
  { id: "globaly-marketer-can-create", name: "Marketer can create", description: "Global marketer create permission for modules that explicitly require this token", department: "Global role permissions" },
  { id: "globaly-marketer-can-view", name: "Marketer can view", description: "Global marketer view permission for modules that explicitly require this token", department: "Global role permissions" },
  { id: "globaly-marketer-can-write", name: "Marketer can write", description: "Global marketer write permission for modules that explicitly require this token", department: "Global role permissions" },
  { id: "globaly-marketer-can-delete", name: "Marketer can delete", description: "Global marketer delete permission for modules that explicitly require this token", department: "Global role permissions" },
  { id: "orders-report", name: "Orders Report", description: "Access to Orders Report module and its API endpoints", department: "Reports" },
  { id: "sales-channels-manager", name: "Sales Channels", description: "Legacy full access to the Sales Channels module and its API endpoints", department: "Store" },
  { id: "sales-channels-view", name: "Sales Channels view", description: "Read-only access to the Sales Channels module", department: "Store" },
  { id: "sales-channels-manage", name: "Sales Channels manage", description: "Access to manage Sales Channels module settings and write operations", department: "Store" },
  { id: "setup-checklist", name: "Setup checklist", description: "Access to the Setup checklist page and its API endpoints", department: "System" },
  { id: "delivery-zones-view", name: "Delivery zones view", description: "Read-only access to the Delivery zones module", department: "Store" },
  { id: "delivery-zones-manage", name: "Delivery zones manage", description: "Edit delivery zones", department: "Store" },
];

/**
 * Sidebar entries that are not module pages: the product catalog (an Adminizer catalog, not a
 * route of ours) and the storefront preview.
 */
export const adminPanelNavbarLinks: AdminPanelNavbarLink[] = [
  { id: "restoapp-catalog", title: "Products", linkType: "admin", link: "/catalog/products", icon: "book", accessRightsToken: "catalog-products", section: "Catalog" },
  { id: "restoapp-catalog-preview", title: "Preview", linkType: "absolute", link: "/menu", icon: "web", section: "Catalog" },
];

export const adminPanelWidgets: AdminPanelWidget[] = [
  { id: "dish-count", module: "widgets/DishCount" },
  { id: "order-count", module: "widgets/TodayOrdersCount" },
  { id: "dishes-on-stop", module: "widgets/DishesOnStop" },
  { id: "notifications-today-count", module: "widgets/NotificationsTodayCount" },
  { id: "sales-channels-count", module: "widgets/SalesChannelsCount" },
  { id: "setup-checklist-status", module: "widgets/SetupChecklist", needsRoutePrefix: true },
];

/**
 * Widgets shown on a fresh dashboard. `setup-checklist-status_0` carries Adminizer's
 * single-underscore instance suffix for custom widgets.
 */
export const adminPanelDashboardWidgets: string[] = [
  "dish-count",
  "order-count",
  "dishes-on-stop",
  "sales-channels-count",
  "setup-checklist-status_0",
];

export const adminPanelControls: AdminPanelControl[] = [
  { name: "order-logs-viewer", type: "jsonEditor", module: "../../libs/adminpanel/controls/OrderLogsViewerControl", export: "OrderLogsViewerControl", asset: "OrderLogsViewer.js" },
  { name: "worktime-viewer", type: "jsonEditor", module: "../../libs/adminpanel/controls/WorktimeViewerControl", export: "WorktimeViewerControl", asset: "WorktimeViewer.js" },
  { name: "modifiers-editor", type: "jsonEditor", module: "../../libs/adminpanel/controls/ModifiersEditorControl", export: "ModifiersEditorControl", asset: "ModifiersEditor.js" },
  { name: "tags-editor", type: "jsonEditor", module: "../../libs/adminpanel/controls/TagsEditorControl", export: "TagsEditorControl", asset: "TagsEditor.js" },
];

export const adminPanelCatalog = {
  module: "../../libs/adminpanel/ProductCatalog/ProductCatalog",
  export: "ProductCatalog",
  accessRightsToken: "catalog-products",
};

export const adminPanelMediaManager = {
  module: "../../libs/adminpanel/ProductMediaManager/ProductMediaManager",
  export: "ProductMediaManager",
};

/** Built admin modules and controls (`npm run build:adminizer`). */
export const adminPanelAssetsDir = path.resolve(__dirname, "../../assets/core-adminizer-assets");

/**
 * URL the assets are published under. Sails serves this directory from
 * `hook/bindAssets.ts`; a NodeKnit host publishes the same paths through the app asset API,
 * because the built entry files import their shared chunks relative to it.
 */
export const adminPanelAssetsUrl = "/restocore/assets/core-adminizer-assets";

/** Translations merged into the panel's own locales. */
export const adminPanelLocalesDir = path.resolve(__dirname, "i18n/locales");

/**
 * Loads a manifest entry's module. Paths are resolved against this file, so the core keeps
 * owning its own module resolution no matter which host reads the manifest.
 */
export function loadAdminPanelModule(modulePath: string): any {
  return require(`./${modulePath}`);
}

/** Loads a controller or middleware: `export default function (req, res)`. */
export function loadAdminPanelController(modulePath: string): (req: any, res: any, next?: any) => any {
  const loaded = loadAdminPanelModule(modulePath);
  return loaded?.default ?? loaded;
}

/** Every page of the panel the core owns, in binding order. */
export function adminPanelPages(): AdminPanelPage[] {
  return adminPanelModules
    .map((module) => module.page)
    .filter((page): page is AdminPanelPage => Boolean(page));
}
