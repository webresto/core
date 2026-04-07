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
          department: 'catalog'
        },
        ...catalogIds.map((catalogId: string) => ({
          id: `catalog-products-${catalogId}`,
          name: `Product catalog (${catalogId})`,
          description: `Access to edit catalog for products-${catalogId}`,
          department: 'catalog'
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
