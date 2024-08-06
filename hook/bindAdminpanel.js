"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = __importDefault(require("../libs/adminpanel/model/settings"));
const CatalogHandler_1 = require("sails-adminpanel/lib/catalog/CatalogHandler");
const ProductCatalog_1 = require("../libs/adminpanel/ProductCatalog/ProductCatalog");
const productCatalog = new ProductCatalog_1.ProductCatalog();
CatalogHandler_1.CatalogHandler.add(productCatalog);
function bindAdminpanel() {
    sails.on('Adminpanel:afterHook:loaded', async () => {
        processBindAdminpanel();
    });
}
exports.default = bindAdminpanel;
function processBindAdminpanel() {
    if (sails.hooks?.adminpanel?.addModelConfig !== undefined) {
        const addModelConfig = sails.hooks.adminpanel.addModelConfig;
        addModelConfig(settings_1.default);
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
