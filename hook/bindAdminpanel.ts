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
  })
}

// Добавляем метод для обновления моделей админки
function addModelConfig(newModels: Record<string, any>) {
  if (!sails.config.adminpanel || !sails.config.adminpanel.models) return;
  Object.assign(sails.config.adminpanel.models, newModels);
}



function processBindAdminpanel(){
  // Используем локальный addModelConfig
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
  if (sails.hooks.adminpanel && sails.hooks.adminpanel.adminizer) {
    const adminizer = sails.hooks.adminpanel.adminizer;
    adminizer.emitter.on('adminizer:loaded', () => {
      const routePrefix = adminizer.config.routePrefix;

      // Route for product setup page
      adminizer.app.get(`${routePrefix}/product-setup`, (req: any, res: any) => {
        if (adminizer.config.auth?.enable && !req.user) {
          return res.redirect(`${routePrefix}/model/userap/login`);
        }
        // For now, redirect to catalog - later can render ProductSetup component
        return res.redirect(`${routePrefix}/catalog/products`);
      });

      // API routes for concepts
      // @ts-ignore
      adminizer.app.get(`${routePrefix}/catalog/products/concepts`, sails.controllers.productsetup.concepts);
      // @ts-ignore
      adminizer.app.post(`${routePrefix}/catalog/products/concepts`, sails.controllers.productsetup.addConcept);
      // @ts-ignore
      adminizer.app.delete(`${routePrefix}/catalog/products/concepts/:concept`, sails.controllers.productsetup.deleteConcept);
    });
  }
}


