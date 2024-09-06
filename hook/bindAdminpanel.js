"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bind_1 = __importDefault(require("../libs/adminpanel/models/bind"));
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
exports.default = bindAdminpanel;
function processBindAdminpanel() {
    if (sails.hooks?.adminpanel?.addModelConfig !== undefined) {
        const addModelConfig = sails.hooks.adminpanel.addModelConfig;
        addModelConfig(bind_1.default);
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
