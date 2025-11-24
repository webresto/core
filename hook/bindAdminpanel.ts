// todo: fix types model instance to {%ModelName%}Record for bind"
import { ProductCatalog } from "../libs/adminpanel/ProductCatalog/ProductCatalog";
import { ProductMediaManager } from "../libs/adminpanel/ProductMediaManager/ProductMediaManager";
import {models } from "../libs/adminpanel/models/bind" 
export default function bindAdminpanel () {
  processBindAdminpanel();
  sails.on('Adminpanel:loaded', async ()=>{
    // Catalog bind
    const catalogHandler = sails.hooks.adminpanel.adminizer.catalogHandler
    const productCatalog = new ProductCatalog()
    catalogHandler.add(productCatalog);

    // Product media manager bind
    const mediaManagerHandler = sails.hooks.adminpanel.adminizer.mediaManagerHandler
    const productMediaManager = new ProductMediaManager()
    mediaManagerHandler.add(productMediaManager)

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



function processBindAdminpanel(){
  // Using local addModelConfig
  addModelConfig(models);

  if(Array.isArray(sails.config.adminpanel?.sections)){
    let baseRoute = sails.config.adminpanel.routePrefix;
    sails.config.adminpanel.sections.push({
      id: 'products',
      title: 'Products',
      link: `${baseRoute}/catalog/products`,
      icon: `barcode`
    });
  }



  // Add navbar link for product catalog
  if (sails.config.adminpanel.navbar && Array.isArray(sails.config.adminpanel.navbar.additionalLinks)) {
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
  sails.on('Adminpanel:afterHook:loaded', async ()=>{
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
            section: 'Tools'
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


