"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bindAdminpanel;
// todo: fix types model instance to {%ModelName%}Record for bind"
const ProductCatalog_1 = require("../libs/adminpanel/ProductCatalog/ProductCatalog");
function bindAdminpanel() {
    sails.on('Adminpanel:afterHook:loaded', async () => {
        processBindAdminpanel();
        console.log(111333);
        const CatalogHandler = sails.hooks.adminpanel.getCatalogHandler();
        const productCatalog = new ProductCatalog_1.ProductCatalog();
        CatalogHandler.add(productCatalog);
    });
}
function processBindAdminpanel() {
    if (sails.hooks?.adminpanel?.addModelConfig !== undefined) {
        const addModelConfig = sails.hooks.adminpanel.addModelConfig;
        addModelConfig(models);
    }
    if (Array.isArray(sails.config.adminpanel?.sections)) {
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
