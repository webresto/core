import * as fs from "fs";
import * as path from "path";

// todo: fix types model instance to {%ModelName%}Record for bind"

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
        id: 'orders-report',
        name: 'Orders Report',
        description: 'Access to Orders Report module and its API endpoints',
        department: 'Reports'
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
        const policies = adminizer.config.policies;
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
            adminizer.policyManager.bindPolicies(policies, stockController)
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
            adminizer.policyManager.bindPolicies(policies, orderKanbanController)
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
            adminizer.policyManager.bindPolicies(policies, notificationsManagerController)
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
            adminizer.policyManager.bindPolicies(policies, notificationChannelsController)
          );
        } catch (e) {
          sails.log.debug('NotificationChannels route bind error', e);
        }

        // API route for search used by StockManager frontend — expose under admin path
        try {
          const searchController = require('../lib/adminpanel/src/controller/search').default;
          // Expose at <routePrefix>/core/api?q=... for admin-scoped API
          adminizer.app.get(`${routePrefix}/core/api`, adminizer.policyManager.bindPolicies(policies, searchController));
        } catch (e) {
          sails.log.debug('StockManager search route bind error', e);
        }

        // API route for updating stock
        try {
          const updateStockController = require('../lib/adminpanel/src/controller/update-stock').default;
          adminizer.app.post(`${routePrefix}/core/update-stock`, adminizer.policyManager.bindPolicies(policies, updateStockController));
        } catch (e) {
          sails.log.debug('StockManager update stock route bind error', e);
        }

        // API route for getting stock items
        try {
          const getStockItemsController = require('../lib/adminpanel/src/controller/get-stock-items').default;
          adminizer.app.get(`${routePrefix}/core/stock-items`, adminizer.policyManager.bindPolicies(policies, getStockItemsController));
        } catch (e) {
          sails.log.debug('StockManager get stock items route bind error', e);
        }

        // API route for getting groups
        try {
          const getGroupsController = require('../lib/adminpanel/src/controller/get-groups').default;
          adminizer.app.get(`${routePrefix}/core/groups`, adminizer.policyManager.bindPolicies(policies, getGroupsController));
        } catch (e) {
          sails.log.debug('StockManager get groups route bind error', e);
        }

        // API route for getting dishes by group
        try {
          const getDishesByGroupController = require('../lib/adminpanel/src/controller/get-dishes-by-group').default;
          adminizer.app.get(`${routePrefix}/core/dishes-by-group`, adminizer.policyManager.bindPolicies(policies, getDishesByGroupController));
        } catch (e) {
          sails.log.debug('StockManager get dishes by group route bind error', e);
        }

        // API route for updating visibility
        try {
          const updateVisibilityController = require('../lib/adminpanel/src/controller/update-visibility').default;
          adminizer.app.post(`${routePrefix}/core/update-visibility`, adminizer.policyManager.bindPolicies(policies, updateVisibilityController));
        } catch (e) {
          sails.log.debug('StockManager update visibility route bind error', e);
        }

        // API route for updating isDeleted flag (used by StockManager frontend)
        try {
          const updateIsDeletedController = require('../lib/adminpanel/src/controller/update-is-deleted').default;
          adminizer.app.post(`${routePrefix}/core/update-is-deleted`, adminizer.policyManager.bindPolicies(policies, updateIsDeletedController));
        } catch (e) {
          sails.log.debug('StockManager update isDeleted route bind error', e);
        }

        // API route for order kanban list
        try {
          const getOrderKanbanOrdersController = require('../lib/adminpanel/src/controller/get-order-kanban-orders').default;
          adminizer.app.get(
            `${routePrefix}/core/order-kanban/orders`,
            adminizer.policyManager.bindPolicies(policies, getOrderKanbanOrdersController)
          );
        } catch (e) {
          sails.log.debug('OrderKanban list route bind error', e);
        }

        // API route for order kanban single order details
        try {
          const getOrderKanbanOrderController = require('../lib/adminpanel/src/controller/get-order-kanban-order').default;
          adminizer.app.get(
            `${routePrefix}/core/order-kanban/order`,
            adminizer.policyManager.bindPolicies(policies, getOrderKanbanOrderController)
          );
        } catch (e) {
          sails.log.debug('OrderKanban order route bind error', e);
        }

        // API route for order kanban SSE stream
        try {
          const orderKanbanStreamController = require('../lib/adminpanel/src/controller/order-kanban-stream').default;
          adminizer.app.get(
            `${routePrefix}/core/order-kanban/stream`,
            adminizer.policyManager.bindPolicies(policies, orderKanbanStreamController)
          );
        } catch (e) {
          sails.log.debug('OrderKanban stream route bind error', e);
        }

        // API route for order kanban state update
        try {
          const updateOrderKanbanStateController = require('../lib/adminpanel/src/controller/update-order-kanban-state').default;
          adminizer.app.post(
            `${routePrefix}/core/order-kanban/state`,
            adminizer.policyManager.bindPolicies(policies, updateOrderKanbanStateController)
          );
        } catch (e) {
          sails.log.debug('OrderKanban state route bind error', e);
        }

        // API route for notifications list
        try {
          const getNotificationsController = require('../lib/adminpanel/src/controller/get-notifications').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/notifications`,
            adminizer.policyManager.bindPolicies(policies, getNotificationsController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager list route bind error', e);
        }

        // API route for single notification details
        try {
          const getNotificationController = require('../lib/adminpanel/src/controller/get-notification').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/notification`,
            adminizer.policyManager.bindPolicies(policies, getNotificationController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager notification route bind error', e);
        }

        // API route for retrying delivery
        try {
          const retryNotificationController = require('../lib/adminpanel/src/controller/retry-notification').default;
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/retry`,
            adminizer.policyManager.bindPolicies(policies, retryNotificationController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager retry route bind error', e);
        }

        // API route for escalation to the next channel
        try {
          const escalateNotificationController = require('../lib/adminpanel/src/controller/escalate-notification').default;
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/escalate`,
            adminizer.policyManager.bindPolicies(policies, escalateNotificationController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager escalate route bind error', e);
        }

        // API route for searching users for notification creation
        try {
          const searchNotificationUsersController = require('../lib/adminpanel/src/controller/search-notification-users').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/users`,
            adminizer.policyManager.bindPolicies(policies, searchNotificationUsersController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager users route bind error', e);
        }

        // API route for creating notification
        try {
          const createNotificationController = require('../lib/adminpanel/src/controller/create-notification').default;
          adminizer.app.post(
            `${routePrefix}/core/notifications-manager/create`,
            adminizer.policyManager.bindPolicies(policies, createNotificationController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager create route bind error', e);
        }

        // API route for notification channels overview
        try {
          const getNotificationChannelsController = require('../lib/adminpanel/src/controller/get-notification-channels').default;
          adminizer.app.get(
            `${routePrefix}/core/notifications-manager/channels`,
            adminizer.policyManager.bindPolicies(policies, getNotificationChannelsController)
          );
        } catch (e) {
          sails.log.debug('NotificationsManager channels route bind error', e);
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
            adminizer.policyManager.bindPolicies(policies, settingsManagerController)
          );

          adminizer.app.get(
            `${routePrefix}/core/settings-manager/list`,
            adminizer.policyManager.bindPolicies(policies, getSettingsController)
          );

          adminizer.app.post(
            `${routePrefix}/core/settings-manager/update/:key`,
            adminizer.policyManager.bindPolicies(policies, updateSettingController)
          );

          adminizer.app.get(
            `${routePrefix}/core/settings-manager/export`,
            adminizer.policyManager.bindPolicies(policies, exportSettingsController)
          );

          adminizer.app.post(
            `${routePrefix}/core/settings-manager/import`,
            adminizer.policyManager.bindPolicies(policies, importSettingsController)
          );
        } catch (e) {
          sails.log.debug('SettingsManager route bind error', e);
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
            adminizer.policyManager.bindPolicies(policies, ordersReportController)
          );
        } catch (e) {
          sails.log.debug('OrdersReport route bind error', e);
        }

        // API route for orders report data
        try {
          const getOrdersReportDataController = require('../lib/adminpanel/src/controller/get-orders-report-data').default;
          adminizer.app.get(
            `${routePrefix}/core/orders-report/data`,
            adminizer.policyManager.bindPolicies(policies, getOrdersReportDataController)
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
