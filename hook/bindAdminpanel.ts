// todo: fix types model instance to {%ModelName%}Record for bind"

export default function bindAdminpanel() {
  processBindAdminpanel();
  sails.on('Adminpanel:loaded', async () => {
    if (!sails.hooks.adminpanel?.adminizer) return;

    let ProductCatalog: any;
    let ProductMediaManager: any;
    let OrderLogsViewerControl: any;
    let initializeWidgets: any;
    try {
      ProductCatalog = require("../libs/adminpanel/ProductCatalog/ProductCatalog").ProductCatalog;
      ProductMediaManager = require("../libs/adminpanel/ProductMediaManager/ProductMediaManager").ProductMediaManager;
      OrderLogsViewerControl = require("../libs/adminpanel/controls/OrderLogsViewerControl").OrderLogsViewerControl;
      initializeWidgets = require("../lib/adminpanel/widgets").initializeWidgets;
    } catch (e) {
      sails.log.warn("Adminpanel bindings are skipped: failed to load adminpanel modules", e);
      return;
    }

    // Catalog bind
    const catalogHandler = sails.hooks.adminpanel.adminizer.catalogHandler
    const productCatalog = new ProductCatalog()
    catalogHandler.add(productCatalog);

    // Product media manager bind
    const mediaManagerHandler = sails.hooks.adminpanel.adminizer.mediaManagerHandler
    const productMediaManager = new ProductMediaManager()
    mediaManagerHandler.add(productMediaManager)

    // Order logs custom viewer control bind
    const controlsHandler = sails.hooks.adminpanel.adminizer.controlsHandler;
    if (!controlsHandler.get("jsonEditor", "order-logs-viewer")) {
      controlsHandler.add(new OrderLogsViewerControl(sails.hooks.adminpanel.adminizer));
    }

    // Initialize dashboard widgets
    initializeWidgets();

    const adminizer = sails.hooks.adminpanel.adminizer;
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

  if (Array.isArray(sails.config.adminpanel?.sections)) {
    let baseRoute = sails.config.adminpanel.routePrefix;
    sails.config.adminpanel.sections.push({
      id: 'products',
      title: 'Products',
      link: `${baseRoute}/catalog/products`,
      icon: `barcode`
    });
  }

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
            section: 'Catalog'
          });

          adminizer.app.get(
            `${routePrefix}/stock-manager`,
            adminizer.policyManager.bindPolicies(policies, stockController)
          );
        } catch (e) {
          sails.log.debug('StockManager route bind error', e);
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


