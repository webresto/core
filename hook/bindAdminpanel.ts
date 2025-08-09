// todo: fix types model instance to {%ModelName%}Record for bind"
import { ProductCatalog } from "../libs/adminpanel/ProductCatalog/ProductCatalog";
import { ProductMediaManager } from "../libs/adminpanel/ProductMediaManager/ProductMediaManager";
import {models } from "../libs/adminpanel/models/bind" 
export default function bindAdminpanel () {
  processBindAdminpanel();
  sails.on('Adminpanel:afterHook:loaded', async ()=>{
    // Catalog bind
    const CatalogHandler = sails.hooks.adminpanel.adminizer.getCatalogHandler()
    const productCatalog = new ProductCatalog()
    CatalogHandler.add(productCatalog);

    // Product media manager bind
    const MediaManagerHandler = sails.hooks.adminpanel.adminizer.getMediaManagerHandler()
    const productMediaManager = new ProductMediaManager()
    MediaManagerHandler.add(productMediaManager)
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
}


