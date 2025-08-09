"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bindAdminpanel;
// todo: fix types model instance to {%ModelName%}Record for bind"
const ProductCatalog_1 = require("../libs/adminpanel/ProductCatalog/ProductCatalog");
const ProductMediaManager_1 = require("../libs/adminpanel/ProductMediaManager/ProductMediaManager");
const bind_1 = require("../libs/adminpanel/models/bind");
function bindAdminpanel() {
    processBindAdminpanel();
    sails.on('Adminpanel:afterHook:loaded', async () => {
        // Catalog bind
        const CatalogHandler = sails.hooks.adminpanel.adminizer.getCatalogHandler();
        const productCatalog = new ProductCatalog_1.ProductCatalog();
        CatalogHandler.add(productCatalog);
        // Product media manager bind
        const MediaManagerHandler = sails.hooks.adminpanel.adminizer.getMediaManagerHandler();
        const productMediaManager = new ProductMediaManager_1.ProductMediaManager();
        MediaManagerHandler.add(productMediaManager);
    });
}
// Добавляем метод для обновления моделей админки
function addModelConfig(newModels) {
    if (!sails.config.adminpanel || !sails.config.adminpanel.models)
        return;
    Object.assign(sails.config.adminpanel.models, newModels);
}
function processBindAdminpanel() {
    // Используем локальный addModelConfig
    addModelConfig(bind_1.models);
    if (Array.isArray(sails.config.adminpanel?.sections)) {
        let baseRoute = sails.config.adminpanel.routePrefix;
        sails.config.adminpanel.sections.push({
            id: 'products',
            title: 'Products',
            link: `${baseRoute}/catalog/products`,
            icon: `barcode`
        });
    }
}
