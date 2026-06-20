import * as fs from "fs";
import * as path from "path";

// todo: fix types model instance to {%ModelName%}Record for bind"

function normalizeHandlers(bound: any): any[] {
  return Array.isArray(bound) ? bound : [bound];
}

function makeAdminizerBinder(adminizer: any): (action: any) => any[] {
  const hasMiddlewareManager =
    adminizer.middlewareManager &&
    typeof adminizer.middlewareManager.bindMiddlewares === 'function';

  if (hasMiddlewareManager) {
    const middlewares = adminizer.config.middlewares ?? [];
    return (action: any) => normalizeHandlers(adminizer.middlewareManager.bindMiddlewares(middlewares, action));
  }

  const policies = adminizer.config.policies;
  return (action: any) => normalizeHandlers(adminizer.policyManager.bindPolicies(policies, action));
}

export default function bindAdminpanel() {
  processBindAdminpanel();
  sails.on('Adminpanel:loaded', async () => {
    if (!sails.hooks.adminpanel?.adminizer) return;

    let ProductCatalog: any;
    let ProductMediaManager: any;
    let initializeWidgets: any;
    try {
      ProductCatalog = require("../libs/adminpanel/ProductCatalog/ProductCatalog").ProductCatalog;
      ProductMediaManager = require("../libs/adminpanel/ProductMediaManager/ProductMediaManager").ProductMediaManager;
      initializeWidgets = require("../lib/adminpanel/widgets").initializeWidgets;
    } catch (e) {
      sails.log.warn("Adminpanel bindings are skipped: failed to load adminpanel modules", e);
      return;
    }

    const adminizer = sails.hooks.adminpanel.adminizer;
    appendTranslations(adminizer);

    // Catalog bind
    const catalogHandler = adminizer.catalogHandler
    const productCatalog = new ProductCatalog()
    catalogHandler.add(productCatalog);
    try {
      const catalogIds = await productCatalog.getIdList();
      adminizer.accessRightsHelper.registerTokens([
        {
          id: 'catalog-products',
          name: 'Product catalog',
          description: 'Access to edit catalog for products',
          department: 'Catalog'
        },
        ...catalogIds.map((catalogId: string) => ({
          id: `catalog-products-${catalogId}`,
          name: "Product catalog",
          description: "Access to edit catalog for products",
          department: 'Catalog'
        }))
      ]);
    } catch (e) {
      sails.log.warn('Catalog access rights registration skipped', e);
    }

    // Product media manager bind
    const mediaManagerHandler = adminizer.mediaManagerHandler
    const productMediaManager = new ProductMediaManager()
    mediaManagerHandler.add(productMediaManager)

    // Order logs custom viewer control bind
    try {
      const OrderLogsViewerControl = require("../libs/adminpanel/controls/OrderLogsViewerControl").OrderLogsViewerControl;
      const controlsHandler = sails.hooks.adminpanel.adminizer.controlsHandler;
      if (!controlsHandler.get("jsonEditor", "order-logs-viewer")) {
        controlsHandler.add(new OrderLogsViewerControl(sails.hooks.adminpanel.adminizer));
      }
    } catch (e) {
      sails.log.warn("Order logs viewer control binding skipped", e);
    }

    // Initialize dashboard widgets
    initializeWidgets();

    adminizer.accessRightsHelper.registerTokens([
      {
        id: 'stock-manager',
        name: 'Stock Manager',
        description: 'Access to Stock Manager module and its API endpoints',
        department: 'Catalog'
      },
      {
        id: 'order-kanban',
        name: 'Current Orders',
        description: 'Access to Current Orders module and its API endpoints',
        department: 'Orders'
      },
      {
        id: 'notifications-manager',
        name: 'Notifications',
        description: 'Access to Notifications module and its API endpoints',
        department: 'Notifications'
      },
      {
        id: 'promocodes-manager',
        name: 'Promo codes',
        description: 'Access to the Promo codes module and its API endpoints',
        department: 'Marketing'
      },
      {
        id: 'promotions-manager',
        name: 'Promotions',
        description: 'Access to the Promotions module and its API endpoints',
        department: 'Marketing'
      },
      {
        id: 'orders-report',
        name: 'Orders Report',
        description: 'Access to Orders Report module and its API endpoints',
        department: 'Reports'
      },
      {
        id: 'setup-checklist',
        name: 'Setup checklist',
        description: 'Access to the Setup checklist page and its API endpoints',
        department: 'System'
      }
    ]);

    adminizer.config.navbar.additionalLinks.push({
      id: 'restoapp-catalog',
      title: 'Products',
      link: `/admin/catalog/products`,
      icon: `book`,
      accessToken: "restoapp-catalog",
      section: 'Catalog'
    });
    adminizer.config.navbar.additionalLinks.push({
      id: 'restoapp-catalog-preview',
      title: 'Preview',
      link: `/menu`,
      icon: `web`,
      section: 'Catalog'
    });
  })
}

function appendTranslations(adminizer: any) {
  if (!adminizer?.i18n?.appendLocale) {
    sails.log.warn("Adminizer i18n.appendLocale is not available, skipping core programmatic translations");
    return;
  }

  const translationsDir = path.resolve(__dirname, "../lib/adminpanel/i18n/locales");
  if (!fs.existsSync(translationsDir)) {
    sails.log.warn(`Adminpanel module translations directory not found: ${translationsDir}`);
    return;
  }

  const locales = sails.config.i18n?.locales ?? [];
  for (const locale of locales) {
    const localeFile = path.resolve(translationsDir, `${locale}.json`);
    if (!fs.existsSync(localeFile)) {
      sails.log.debug(`Adminpanel module translations: locale file not found for ${locale}`);
      continue;
    }

    try {
      const fileContent = fs.readFileSync(localeFile, "utf8");
      const jsonData = JSON.parse(fileContent);
      adminizer.i18n.appendLocale(locale, jsonData);
    } catch (error) {
      sails.log.error(`Adminpanel module translations > Error when reading ${locale}.json:`, error);
    }
  }
}

// Adding a method to update admin panel models
function addModelConfig(newModels: Record<string, any>) {
  if (!sails.config.adminpanel || !sails.config.adminpanel.models) return;
  Object.assign(sails.config.adminpanel.models, newModels);
}



function processBindAdminpanel() {
  // Using local addModelConfig
  try {
    const models = require("../libs/adminpanel/models/bind").models;
    addModelConfig(models);
  } catch (e) {
    sails.log.warn("Adminpanel model bindings are skipped: failed to load model configs", e);
  }

  // if (Array.isArray(sails.config.adminpanel?.sections)) {
  //   let baseRoute = sails.config.adminpanel.routePrefix;
  //   sails.config.adminpanel.sections.push({
  //     id: 'products',
  //     title: 'Products',
  //     link: `${baseRoute}/catalog/products`,
  //     icon: `barcode`
  //   });
  // }

  // Configure dashboard widgets
  if (sails.config.adminpanel?.dashboard) {
    if (!sails.config.adminpanel.dashboard.defaultWidgets) {
      sails.config.adminpanel.dashboard.defaultWidgets = [];
    }
    // Add core widgets to default widgets list
    const coreWidgets = ['dish-count',
       'order-count', 
       'dishes-on-stop'];
    coreWidgets.forEach(widgetId => {
      if (!sails.config.adminpanel.dashboard.defaultWidgets.includes(widgetId)) {
        sails.config.adminpanel.dashboard.defaultWidgets.push(widgetId);
      }
    });
  }

  // Add navbar link for product catalog
  if (sails.config.adminpanel?.navbar && Array.isArray(sails.config.adminpanel.navbar.additionalLinks)) {
    let baseRoute = sails.config.adminpanel.routePrefix;
    sails.config.adminpanel.navbar.additionalLinks.push({
      id: 'product-catalog',
      title: 'Catalog',
      link: `${baseRoute}/catalog/products`,
      icon: 'shopping-cart' as any,
      section: 'Store' as any
    });
  }

  // Add routes for product setup  
  sails.on('Adminpanel:afterHook:loaded', async () => {
    if (sails.hooks.adminpanel && sails.hooks.adminpanel.adminizer) {
      const adminizer = sails.hooks.adminpanel.adminizer;
      adminizer.emitter.on('adminizer:loaded', () => {
        const routePrefix = adminizer.config.routePrefix;
        const bind = makeAdminizerBinder(adminizer);

        let getInertiaLocaleAndMessages: ((req: any) => { locale: string; messages: Record<string, string> }) | null = null;

        try {
          ({ getInertiaLocaleAndMessages } = require("../lib/adminpanel/src/controller/i18n-messages"));
        } catch (e) {
          sails.log.debug("Adminpanel i18n helper binding skipped", e);
        }

        // Prevent browser/proxy caching for admin core API responses.
        adminizer.app.use(`${routePrefix}/core`, (_req: any, res: any, next: any) => {
          res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          res.set('Surrogate-Control', 'no-store');
          next();
        });

        if (getInertiaLocaleAndMessages) {
          adminizer.app.use(`${routePrefix}`, (req: any, _res: any, next: any) => {
            if (req?.Inertia?.shareProps) {
              const { locale, messages } = getInertiaLocaleAndMessages!(req);
              req.Inertia.shareProps({ locale, messages });
            }
            next();
          });
        }

        // StockManager module link + route
        try {
          const stockController = require('../lib/adminpanel/src/controller/stock-manager').default;
          adminizer.config.navbar.additionalLinks.push({
            id: 'stock-manager',
            title: 'Stock Manager',
            link: `${routePrefix}/stock-manager`,
            icon: 'warehouse',
            accessToken: 'stock-manager',
            section: 'Catalog'
          });

          adminizer.app.get(
            `${routePrefix}/stock-manager`,
            ...bind(stockController)
          );
        } catch (e) {
          sails.log.debug('StockManager route bind error', e);
        }

        // OrderKanban module link + route
        try {
          const orderKanbanController = require('../lib/adminpanel/src/controller/order-kanban').default;
          adminizer.config.navbar.additionalLinks.push({
            id: 'order-kanban',
            title: 'Current Orders',
            link: `${routePrefix}/order-kanban`,
            icon: 'view_kanban',
            accessToken: 'order-kanban',
            section: 'Orders'
          });

          adminizer.app.get(
            `${routePrefix}/order-kanban`,
            ...bind(orderKanbanController)
          );

          // Make order kanban the default admin landing page.
          adminizer.app.get(
            `${routePrefix}`,
            ...bind((_req: any, res: any) => {
              return res.redirect(`${routePrefix}/order-kanban`);
            })
          );
        } catch (e) {
          sails.log.debug('OrderKanban route bind error', e);
        }

        // Notifications module link + route
        try {
          const notificationsManagerController = require('../lib/adminpanel/src/controller/notifications-manager').default;
          adminizer.config.navbar.additionalLinks.push({
            id: 'notifications-manager',
            title: 'Notifications',
            link: `${routePrefix}/notifications-manager`,
            icon: 'notifications',
            accessToken: 'notifications-manager',
            section: 'Notifications'
          });

          adminizer.app.get(
            `${routePrefix}/notifications-manager`,
            ...bind(notificationsManagerController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager route bind error', e);
        }

        try {
          const notificationChannelsController = require('../lib/adminpanel/src/controller/notification-channels').default;
          adminizer.config.navbar.additionalLinks.push({
            id: 'notification-channels',
            title: 'Notification channels',
            link: `${routePrefix}/notification-channels`,
            icon: 'settings_input_component',
            accessToken: 'notifications-manager',
            section: 'Notifications'
          });

          adminizer.app.get(
            `${routePrefix}/notification-channels`,
            ...bind(notificationChannelsController)
          );
        } catch (e) {
          sails.log.debug('NotificationChannels route bind error', e);
        }

        // API route for search used by StockManager frontend — expose under admin path
        try {
          const searchController = require('../lib/adminpanel/src/controller/search').default;
          // Expose at <routePrefix>/core/api?q=... for admin-scoped API
          adminizer.app.get(`${routePrefix}/core/api`, ...bind(searchController));
        } catch (e) {
          sails.log.debug('StockManager search route bind error', e);
        }

        // API route for updating stock
        try {
          const updateStockController = require('../lib/adminpanel/src/controller/update-stock').default;
          adminizer.app.post(`${routePrefix}/core/update-stock`, ...bind(updateStockController));
        } catch (e) {
          sails.log.debug('StockManager update stock route bind error', e);
        }

        // API route for getting stock items
        try {
          const getStockItemsController = require('../lib/adminpanel/src/controller/get-stock-items').default;
          adminizer.app.get(`${routePrefix}/core/stock-items`, ...bind(getStockItemsController));
        } catch (e) {
          sails.log.debug('StockManager get stock items route bind error', e);
        }

        // API route for getting groups
        try {
          const getGroupsController = require('../lib/adminpanel/src/controller/get-groups').default;
          adminizer.app.get(`${routePrefix}/core/groups`, ...bind(getGroupsController));
        } catch (e) {
          sails.log.debug('StockManager get groups route bind error', e);
        }

        // API route for getting dishes by group
        try {
          const getDishesByGroupController = require('../lib/adminpanel/src/controller/get-dishes-by-group').default;
          adminizer.app.get(`${routePrefix}/core/dishes-by-group`, ...bind(getDishesByGroupController));
        } catch (e) {
          sails.log.debug('StockManager get dishes by group route bind error', e);
        }

        // API route for updating visibility
        try {
          const updateVisibilityController = require('../lib/adminpanel/src/controller/update-visibility').default;
          adminizer.app.post(`${routePrefix}/core/update-visibility`, ...bind(updateVisibilityController));
        } catch (e) {
          sails.log.debug('StockManager update visibility route bind error', e);
        }

        // API route for updating isDeleted flag (used by StockManager frontend)
        try {
          const updateIsDeletedController = require('../lib/adminpanel/src/controller/update-is-deleted').default;
          adminizer.app.post(`${routePrefix}/core/update-is-deleted`, ...bind(updateIsDeletedController));
        } catch (e) {
          sails.log.debug('StockManager update isDeleted route bind error', e);
        }

        // API route for order kanban list
        try {
          const getOrderKanbanOrdersController = require('../lib/adminpanel/src/controller/get-order-kanban-orders').default;
          adminizer.app.get(
            `${routePrefix}/core/order-kanban/orders`,
            ...bind(getOrderKanbanOrdersController)
          );
        } catch (e) {
          sails.log.debug('OrderKanban list route bind error', e);
        }

        // API route for order kanban single order details
        try {
          const getOrderKanbanOrderController = require('../lib/adminpanel/src/controller/get-order-kanban-order').default;
          adminizer.app.get(
            `${routePrefix}/core/order-kanban/order`,
            ...bind(getOrderKanbanOrderController)
          );
        } catch (e) {
          sails.log.debug('OrderKanban order route bind error', e);
        }

        // API route for order kanban SSE stream
        try {
          const orderKanbanStreamController = require('../lib/adminpanel/src/controller/order-kanban-stream').default;
          adminizer.app.get(
            `${routePrefix}/core/order-kanban/stream`,
            ...bind(orderKanbanStreamController)
          );
        } catch (e) {
          sails.log.debug('OrderKanban stream route bind error', e);
        }

        // API route for order kanban state update
        try {
          const updateOrderKanbanStateController = require('../lib/adminpanel/src/controller/update-order-kanban-state').default;
          adminizer.app.post(
            `${routePrefix}/core/order-kanban/state`,
            ...bind(updateOrderKanbanStateController)
          );
        } catch (e) {
          sails.log.debug('OrderKanban state route bind error', e);
        }

        // API route for notifications list
        try {
          const getNotificationsController = require('../lib/adminpanel/src/controller/get-notifications').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/notifications`,
            ...bind(getNotificationsController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager list route bind error', e);
        }

        // API route for notifications dashboard stats (per-channel counts, cost, daily trend)
        try {
          const getNotificationStatsController = require('../lib/adminpanel/src/controller/get-notification-stats').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/stats`,
            ...bind(getNotificationStatsController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager stats route bind error', e);
        }

        // API route for single notification details
        try {
          const getNotificationController = require('../lib/adminpanel/src/controller/get-notification').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/notification`,
            ...bind(getNotificationController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager notification route bind error', e);
        }

        // API route for retrying delivery
        try {
          const retryNotificationController = require('../lib/adminpanel/src/controller/retry-notification').default;
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/retry`,
            ...bind(retryNotificationController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager retry route bind error', e);
        }

        // API route for searching users for notification creation
        try {
          const searchNotificationUsersController = require('../lib/adminpanel/src/controller/search-notification-users').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/users`,
            ...bind(searchNotificationUsersController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager users route bind error', e);
        }

        // API route for creating notification
        try {
          const createNotificationController = require('../lib/adminpanel/src/controller/create-notification').default;
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/create`,
            ...bind(createNotificationController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager create route bind error', e);
        }

        // API route for notification channels overview
        try {
          const getNotificationChannelsController = require('../lib/adminpanel/src/controller/get-notification-channels').default;
          const updateNotificationChannelSettingsController = require('../lib/adminpanel/src/controller/update-notification-channel-settings').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/channels`,
            ...bind(getNotificationChannelsController)
          );
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/channel-settings`,
            ...bind(updateNotificationChannelSettingsController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager channels route bind error', e);
        }

        // API routes for notification types catalog (read + write)
        try {
          const getNotificationTypesController = require('../lib/adminpanel/src/controller/get-notification-types').default;
          const getNotificationTypeController = require('../lib/adminpanel/src/controller/get-notification-type').default;
          const upsertNotificationTypeController = require('../lib/adminpanel/src/controller/upsert-notification-type').default;
          const deleteNotificationTypeController = require('../lib/adminpanel/src/controller/delete-notification-type').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/types`,
            ...bind(getNotificationTypesController)
          );
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/type`,
            ...bind(getNotificationTypeController)
          );
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/type`,
            ...bind(upsertNotificationTypeController)
          );
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/type-delete`,
            ...bind(deleteNotificationTypeController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager types route bind error', e);
        }

        // API route for notification events catalog (read-only)
        try {
          const getNotificationEventsController = require('../lib/adminpanel/src/controller/get-notification-events').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/events`,
            ...bind(getNotificationEventsController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager events route bind error', e);
        }

        // API route for emitting a test notification (dry-run / real)
        try {
          const emitTestNotificationController = require('../lib/adminpanel/src/controller/emit-test-notification').default;
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/emit-test`,
            ...bind(emitTestNotificationController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager emit-test route bind error', e);
        }

        // API route for available locales catalog
        try {
          const getNotificationLocalesController = require('../lib/adminpanel/src/controller/get-notification-locales').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/locales`,
            ...bind(getNotificationLocalesController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager locales route bind error', e);
        }

        // Marketing → Promo codes module link + page route + API routes
        try {
          const promoCodesManagerController = require('../lib/adminpanel/src/controller/promocodes-manager').default;
          adminizer.config.navbar.additionalLinks.push({
            id: 'promocodes-manager',
            title: 'Promo codes',
            link: `${routePrefix}/promocodes-manager`,
            icon: 'confirmation_number',
            accessToken: 'promocodes-manager',
            section: 'Marketing'
          });

          adminizer.app.get(
            `${routePrefix}/promocodes-manager`,
            ...bind(promoCodesManagerController)
          );

          const getPromoCodesController = require('../lib/adminpanel/src/controller/get-promocodes').default;
          const getPromoCodeController = require('../lib/adminpanel/src/controller/get-promocode').default;
          const upsertPromoCodeController = require('../lib/adminpanel/src/controller/upsert-promocode').default;
          const deletePromoCodeController = require('../lib/adminpanel/src/controller/delete-promocode').default;
          const getPromoCodesStatsController = require('../lib/adminpanel/src/controller/get-promocodes-stats').default;
          const getPromoCodesActivityController = require('../lib/adminpanel/src/controller/get-promocodes-activity').default;
          const generatePromoCodeController = require('../lib/adminpanel/src/controller/generate-promocode').default;
          const getPromotionsOptionsController = require('../lib/adminpanel/src/controller/get-promotions-options').default;

          adminizer.app.get(`${routePrefix}/core/marketing/promocodes`, ...bind(getPromoCodesController));
          adminizer.app.get(`${routePrefix}/core/marketing/promocodes/stats`, ...bind(getPromoCodesStatsController));
          adminizer.app.get(`${routePrefix}/core/marketing/promocodes/activity`, ...bind(getPromoCodesActivityController));
          adminizer.app.get(`${routePrefix}/core/marketing/promocodes/generate-code`, ...bind(generatePromoCodeController));
          adminizer.app.get(`${routePrefix}/core/marketing/promocode`, ...bind(getPromoCodeController));
          adminizer.app.post(`${routePrefix}/core/marketing/promocode`, ...bind(upsertPromoCodeController));
          adminizer.app.post(`${routePrefix}/core/marketing/promocode-delete`, ...bind(deletePromoCodeController));
          adminizer.app.get(`${routePrefix}/core/marketing/promotions-options`, ...bind(getPromotionsOptionsController));
        } catch (e) {
          sails.log.debug('Marketing PromoCodes route bind error', e);
        }

        // Marketing → Promotions module link + page route + API routes
        try {
          const promotionsManagerController = require('../lib/adminpanel/src/controller/promotions-manager').default;
          adminizer.config.navbar.additionalLinks.push({
            id: 'promotions-manager',
            title: 'Promotions',
            link: `${routePrefix}/promotions-manager`,
            icon: 'local_offer',
            accessToken: 'promotions-manager',
            section: 'Marketing'
          });

          adminizer.app.get(
            `${routePrefix}/promotions-manager`,
            ...bind(promotionsManagerController)
          );

          const getMarketingPromotionsController = require('../lib/adminpanel/src/controller/get-marketing-promotions').default;
          const getMarketingPromotionController = require('../lib/adminpanel/src/controller/get-marketing-promotion').default;
          const upsertMarketingPromotionController = require('../lib/adminpanel/src/controller/upsert-marketing-promotion').default;
          const toggleMarketingPromotionController = require('../lib/adminpanel/src/controller/toggle-marketing-promotion').default;
          const deleteMarketingPromotionController = require('../lib/adminpanel/src/controller/delete-marketing-promotion').default;
          const getMarketingConceptsController = require('../lib/adminpanel/src/controller/get-marketing-concepts').default;
          const getMarketingGroupsController = require('../lib/adminpanel/src/controller/get-marketing-groups').default;
          const getMarketingDishesController = require('../lib/adminpanel/src/controller/get-marketing-dishes').default;

          adminizer.app.get(`${routePrefix}/core/marketing/promotions`, ...bind(getMarketingPromotionsController));
          adminizer.app.get(`${routePrefix}/core/marketing/promotion`, ...bind(getMarketingPromotionController));
          adminizer.app.post(`${routePrefix}/core/marketing/promotion`, ...bind(upsertMarketingPromotionController));
          adminizer.app.post(`${routePrefix}/core/marketing/promotion-toggle`, ...bind(toggleMarketingPromotionController));
          adminizer.app.post(`${routePrefix}/core/marketing/promotion-delete`, ...bind(deleteMarketingPromotionController));
          adminizer.app.get(`${routePrefix}/core/marketing/concepts`, ...bind(getMarketingConceptsController));
          adminizer.app.get(`${routePrefix}/core/marketing/groups`, ...bind(getMarketingGroupsController));
          adminizer.app.get(`${routePrefix}/core/marketing/dishes`, ...bind(getMarketingDishesController));
        } catch (e) {
          sails.log.debug('Marketing Promotions route bind error', e);
        }

        // Settings Manager module link + routes
        try {
          const settingsManagerController = require('../lib/adminpanel/src/controller/settings-manager').default;
          const getSettingsController = require('../lib/adminpanel/src/controller/get-settings').default;
          const updateSettingController = require('../lib/adminpanel/src/controller/update-setting').default;
          const exportSettingsController = require('../lib/adminpanel/src/controller/export-settings').default;
          const importSettingsController = require('../lib/adminpanel/src/controller/import-settings').default;

          adminizer.config.navbar.additionalLinks.push({
            id: 'settings-manager',
            title: 'Settings',
            link: `${routePrefix}/settings-manager`,
            icon: 'settings',
            section: 'System'
          });

          adminizer.app.get(
            `${routePrefix}/settings-manager`,
            ...bind(settingsManagerController)
          );

          adminizer.app.get(
            `${routePrefix}/core/settings-manager/list`,
            ...bind(getSettingsController)
          );

          adminizer.app.post(
            `${routePrefix}/core/settings-manager/update/:key`,
            ...bind(updateSettingController)
          );

          adminizer.app.get(
            `${routePrefix}/core/settings-manager/export`,
            ...bind(exportSettingsController)
          );

          adminizer.app.post(
            `${routePrefix}/core/settings-manager/import`,
            ...bind(importSettingsController)
          );
        } catch (e) {
          sails.log.debug('SettingsManager route bind error', e);
        }

        // Setup checklist module link + page route + API routes
        try {
          const setupChecklistController = require('../lib/adminpanel/src/controller/setup-checklist').default;
          const getSetupChecklistStatusController = require('../lib/adminpanel/src/controller/get-setup-checklist-status').default;
          const getSetupChecklistSummaryController = require('../lib/adminpanel/src/controller/get-setup-checklist-summary').default;
          const dismissSetupCheckupController = require('../lib/adminpanel/src/controller/dismiss-setup-checkup').default;
          const restoreSetupCheckupController = require('../lib/adminpanel/src/controller/restore-setup-checkup').default;

          adminizer.config.navbar.additionalLinks.push({
            id: 'setup-checklist',
            title: 'Setup checklist',
            link: `${routePrefix}/setup-checklist`,
            icon: 'checklist',
            accessToken: 'setup-checklist',
            section: 'System'
          });

          adminizer.app.get(
            `${routePrefix}/setup-checklist`,
            ...bind(setupChecklistController)
          );
          adminizer.app.get(
            `${routePrefix}/core/setup-checklist/status`,
            ...bind(getSetupChecklistStatusController)
          );
          adminizer.app.get(
            `${routePrefix}/core/setup-checklist/summary`,
            ...bind(getSetupChecklistSummaryController)
          );
          adminizer.app.post(
            `${routePrefix}/core/setup-checklist/dismiss`,
            ...bind(dismissSetupCheckupController)
          );
          adminizer.app.post(
            `${routePrefix}/core/setup-checklist/restore`,
            ...bind(restoreSetupCheckupController)
          );
        } catch (e) {
          sails.log.debug('SetupChecklist route bind error', e);
        }

        // OrdersReport module link + route
        try {
          const ordersReportController = require('../lib/adminpanel/src/controller/orders-report').default;
          adminizer.config.navbar.additionalLinks.push({
            id: 'orders-report',
            title: 'Orders Report',
            link: `${routePrefix}/orders-report`,
            icon: 'bar_chart',
            accessToken: 'orders-report',
            section: 'Reports'
          });

          adminizer.app.get(
            `${routePrefix}/orders-report`,
            ...bind(ordersReportController)
          );
        } catch (e) {
          sails.log.debug('OrdersReport route bind error', e);
        }

        // API route for orders report data
        try {
          const getOrdersReportDataController = require('../lib/adminpanel/src/controller/get-orders-report-data').default;
          adminizer.app.get(
            `${routePrefix}/core/orders-report/data`,
            ...bind(getOrdersReportDataController)
          );
        } catch (e) {
          sails.log.debug('OrdersReport data route bind error', e);
        }

        // Route for product setup page
        // adminizer.app.get(`${routePrefix}/product-setup`, (req: any, res: any) => {
        //   if (adminizer.config.auth?.enable && !req.user) {
        //     return res.redirect(`${routePrefix}/model/userap/login`);
        //   }
        //   // For now, redirect to catalog - later can render ProductSetup component
        //   return res.redirect(`${routePrefix}/catalog/products`);
        // });

        // // API routes for concepts
        // // @ts-ignore
        // adminizer.app.get(`${routePrefix}/catalog/products/concepts`, sails.controllers.productsetup.concepts);
        // // @ts-ignore
        // adminizer.app.post(`${routePrefix}/catalog/products/concepts`, sails.controllers.productsetup.addConcept);
        // // @ts-ignore
        // adminizer.app.delete(`${routePrefix}/catalog/products/concepts/:concept`, sails.controllers.productsetup.deleteConcept);
      });
    }
  });

}
