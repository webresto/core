"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */
class RMSAdapter {
    constructor(config) {
        this.config = {};
        this.config = config;
        // Run async inittilization
        RMSAdapter.initialize();
    }
    static async initialize() {
        // Run product sync interval
        const NO_SYNC_NOMENCLATURE = await Settings.get("NO_SYNC_NOMENCLATURE");
        if (!NO_SYNC_NOMENCLATURE) {
            const SYNC_PRODUCTS_INTERVAL_SECOUNDS = await Settings.get("SYNC_PRODUCTS_INTERVAL_SECOUNDS");
            if (RMSAdapter.syncProductsInterval)
                clearInterval(RMSAdapter.syncProductsInterval);
            RMSAdapter.syncProductsInterval = setInterval(async () => {
                RMSAdapter.syncProducts();
            }, SYNC_PRODUCTS_INTERVAL_SECOUNDS < 120 ? 120000 : SYNC_PRODUCTS_INTERVAL_SECOUNDS * 1000 || 120000);
        }
        // Run sync OutOfStock
        const NO_SYNC_OUT_OF_STOCKS = await Settings.get("NO_SYNC_OUT_OF_STOCKS");
        if (!NO_SYNC_OUT_OF_STOCKS) {
            const SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS = await Settings.get("SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS");
            if (RMSAdapter.syncOutOfStocksInterval)
                clearInterval(RMSAdapter.syncOutOfStocksInterval);
            RMSAdapter.syncOutOfStocksInterval = setInterval(async () => {
                RMSAdapter.syncOutOfStocks();
            }, SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS < 60 ? 60000 : SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS * 1000 || 60000);
        }
    }
    /**
     * Menu synchronization with RMS system
     */
    static async syncProducts(force = false) {
        const rootGroupsToSync = await Settings.get("rootGroupsRMSToSync");
        const rmsAdapter = await Adapter.getRMSAdapter();
        if (rmsAdapter.nomenclatureHasUpdated() || force) {
            const currentRMSGroupsFlatTree = await rmsAdapter.loadNomenclatureTree(rootGroupsToSync);
            // TODO: clean deleted dish and groups 
            // CheckSum
            // TODO: UPDATE GROUP LOGIC
            // TODO: udate images
            const currentRMSGroupsIds = currentRMSGroupsFlatTree.map(prd => prd.rmsId);
            for (const group of currentRMSGroupsFlatTree) {
                emitter.emit("rms-sync:before-each-group-item", group);
                const productsToUpdate = await rmsAdapter.loadProductsByGroup(group.rmsId);
                for (let product of productsToUpdate) {
                    // CheckSum
                    emitter.emit("rms-sync:before-each-product-item", product);
                    // TODO: UPDATE PRODUCT LOGIC
                    // TODO: udate images
                }
            }
        }
        return;
    }
    ;
    /**
     * Synchronizing the balance of dishes with the RMS adapter
     */
    static syncOutOfStocks() {
        return;
    }
    ;
}
exports.default = RMSAdapter;
