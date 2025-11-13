"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bindAdminpanel;
// todo: fix types model instance to {%ModelName%}Record for bind"
const ProductCatalog_1 = require("../libs/adminpanel/ProductCatalog/ProductCatalog");
const ProductMediaManager_1 = require("../libs/adminpanel/ProductMediaManager/ProductMediaManager");
const bind_1 = require("../libs/adminpanel/models/bind");
function bindAdminpanel() {
    processBindAdminpanel();
    sails.on('Adminpanel:loaded', async () => {
        // Catalog bind
        const catalogHandler = sails.hooks.adminpanel.adminizer.catalogHandler;
        const productCatalog = new ProductCatalog_1.ProductCatalog();
        catalogHandler.add(productCatalog);
        // Product media manager bind
        const mediaManagerHandler = sails.hooks.adminpanel.adminizer.mediaManagerHandler;
        const productMediaManager = new ProductMediaManager_1.ProductMediaManager();
        mediaManagerHandler.add(productMediaManager);
        const adminizer = sails.hooks.adminpanel.adminizer;
        adminizer.config.navbar.additionalLinks.push({
            id: 'restoapp-catalog',
            title: 'Products',
            link: `/admin/catalog/products`,
            icon: `book`,
            accessToken: "restoapp-catalog",
            section: 'Catalog'
        });
        adminizer.config.navbar.additionalLinks.push({
            id: 'restoapp-catalog-preview',
            title: 'Preview',
            link: `/menu`,
            icon: `web`,
            section: 'Catalog'
        });
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
    // Add navbar link for product catalog
    if (sails.config.adminpanel.navbar && Array.isArray(sails.config.adminpanel.navbar.additionalLinks)) {
        let baseRoute = sails.config.adminpanel.routePrefix;
        sails.config.adminpanel.navbar.additionalLinks.push({
            id: 'product-catalog',
            title: 'Catalog',
            link: `${baseRoute}/catalog/products`,
            icon: 'shopping-cart',
            section: 'Store'
        });
    }
    // Add routes for product setup
    if (sails.hooks.adminpanel && sails.hooks.adminpanel.adminizer) {
        const adminizer = sails.hooks.adminpanel.adminizer;
        adminizer.emitter.on('adminizer:loaded', () => {
            const routePrefix = adminizer.config.routePrefix;
            // Route for product setup page
            adminizer.app.get(`${routePrefix}/product-setup`, (req, res) => {
                if (adminizer.config.auth?.enable && !req.user) {
                    return res.redirect(`${routePrefix}/model/userap/login`);
                }
                // For now, redirect to catalog - later can render ProductSetup component
                return res.redirect(`${routePrefix}/catalog/products`);
            });
            // API routes for concepts
            // @ts-ignore
            adminizer.app.get(`${routePrefix}/catalog/products/concepts`, sails.controllers.productsetup.concepts);
            // @ts-ignore
            adminizer.app.post(`${routePrefix}/catalog/products/concepts`, sails.controllers.productsetup.addConcept);
            // @ts-ignore
            adminizer.app.delete(`${routePrefix}/catalog/products/concepts/:concept`, sails.controllers.productsetup.deleteConcept);
        });
    }
}
