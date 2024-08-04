"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = __importDefault(require("../libs/adminpanel/model/settings"));
const CatalogHandler_1 = require("sails-adminpanel/lib/catalog/CatalogHandler");
const ProductCatalog_1 = require("../libs/adminpanel/ProductCatalog/ProductCatalog");
function bindAdminpanel() {
    sails.on('Adminpanel:afterHook:loaded', async () => {
        processBindAdminpanel();
        CatalogHandler_1.CatalogHandler.add(new ProductCatalog_1.ProductCatalog());
    });
}
exports.default = bindAdminpanel;
function processBindAdminpanel() {
    if (sails.hooks?.adminpanel?.addModelConfig !== undefined) {
        const addModelConfig = sails.hooks.adminpanel.addModelConfig;
        addModelConfig(settings_1.default);
    }
}
