import models  from "../libs/adminpanel/models/bind"
import { ProductCatalog } from "../libs/adminpanel/ProductCatalog/ProductCatalog";

export default function bindAdminpanel () {
  sails.on('Adminpanel:afterHook:loaded', async ()=>{
    processBindAdminpanel();
    console.log(111333)
    const CatalogHandler = sails.hooks.adminpanel.getCatalogHandler()
    const productCatalog = new ProductCatalog()
    CatalogHandler.add(productCatalog);
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
          icon: `barcode`,
          accessToken: "products-access"
      });
  }
}


