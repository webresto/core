import settings from "../libs/adminpanel/model/settings"

import { CatalogHandler } from "sails-adminpanel/lib/catalog/CatalogHandler"
import { ProductCatalog } from "../libs/adminpanel/ProductCatalog/ProductCatalog";
export default function bindAdminpanel () {
  sails.on('Adminpanel:afterHook:loaded', async ()=>{
    processBindAdminpanel();
    CatalogHandler.add(new ProductCatalog());
  })
}


function processBindAdminpanel(){
  if(sails.hooks?.adminpanel?.addModelConfig !== undefined) {
    const addModelConfig = sails.hooks.adminpanel.addModelConfig;
    addModelConfig(settings);
  }
}


