// todo: fix types model instance to {%ModelName%}Record for bind"
import { ProductCatalog } from "../libs/adminpanel/ProductCatalog/ProductCatalog";
import { ProductMediaManager } from "../libs/adminpanel/ProductMediaManager/ProductMediaManager";
import {models } from "../libs/adminpanel/models/bind" 
export default function bindAdminpanel () {
  sails.on('Adminpanel:afterHook:loaded', async ()=>{
    processBindAdminpanel();
    // Catalog bind
    const CatalogHandler = sails.hooks.adminpanel.getCatalogHandler()
    const productCatalog = new ProductCatalog()
    CatalogHandler.add(productCatalog);

    // Product media manager bind
    const MediaManagerHandler = sails.hooks.adminpanel.getMediaManagerHandler()
    const productMediaManager = new ProductMediaManager()
    MediaManagerHandler.add(productMediaManager)
  })
}

function processBindAdminpanel(){
  if(sails.hooks?.adminpanel?.addModelConfig !== undefined) {
    const addModelConfig = sails.hooks.adminpanel.addModelConfig;
    addModelConfig(models);
  }

  if(Array.isArray(sails.config.adminpanel?.sections)){
    let baseRoute = sails.config.adminpanel.routePrefix;
    sails.config.adminpanel.sections.push({
      id: 'products',
          title: 'Products',
          link: `${baseRoute}/catalog/products`,
          icon: `barcode`
      });
  }
}


