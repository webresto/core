import settings from "../libs/adminpanel/model/settings"

import { CatalogHandler } from "sails-adminpanel/lib/catalog/CatalogHandler"
import { ProductCatalog } from "../libs/adminpanel/ProductCatalog/ProductCatalog";


const productCatalog = new ProductCatalog()
CatalogHandler.add(productCatalog);
console.log(productCatalog,CatalogHandler.getAll(),1111122221)
export default function bindAdminpanel () {
  sails.on('Adminpanel:afterHook:loaded', async ()=>{
    processBindAdminpanel();
  })
}

function processBindAdminpanel(){
  if(sails.hooks?.adminpanel?.addModelConfig !== undefined) {
    const addModelConfig = sails.hooks.adminpanel.addModelConfig;
    addModelConfig(settings);
  }

  if(Array.isArray(sails.config.adminpanel?.sections)){
    let baseRoute = sails.config.adminpanel.routePrefix;
    sails.config.adminpanel.sections.push({
      id: 'products',
          title: 'Products',
          link: `${baseRoute}/catalog/products`,
          icon: `barcode`,
          accessToken: "products-access"
      });
  }
}


