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
        const NO_SYNC_NOMENCLATURE = await Settings.get("NO_SYNC_NOMENCLATURE") ?? false;
        if (!NO_SYNC_NOMENCLATURE) {
            const SYNC_PRODUCTS_INTERVAL_SECOUNDS = await Settings.get("SYNC_PRODUCTS_INTERVAL_SECOUNDS");
            if (RMSAdapter.syncProductsInterval)
                clearInterval(RMSAdapter.syncProductsInterval);
            RMSAdapter.syncProductsInterval = setInterval(async () => {
                RMSAdapter.syncProducts();
            }, SYNC_PRODUCTS_INTERVAL_SECOUNDS < 120 ? 120000 : SYNC_PRODUCTS_INTERVAL_SECOUNDS * 1000 || 120000);
        }
        // Run sync OutOfStock
        const NO_SYNC_OUT_OF_STOCKS = await Settings.get("NO_SYNC_OUT_OF_STOCKS") ?? false;
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
     * At first, groups are synchronized, then dishes are synchronized for each of these groups.
     * When synchronizing groups, those groups that were not on the list will be turned off before the start of synchronization
     * Those dishes that are left without ties will be marked with isDeleted
     * There can be no dishes in the root.
     */
    static async syncProducts(force = false) {
        const rootGroupsToSync = await Settings.get("rootGroupsRMSToSync");
        const rmsAdapter = await Adapter.getRMSAdapter();
        if (rmsAdapter.nomenclatureHasUpdated() || force) {
            const currentRMSGroupsFlatTree = await rmsAdapter.loadNomenclatureTree(rootGroupsToSync);
            // Get ids of all current RMS groups
            const rmsGroupIds = currentRMSGroupsFlatTree.map(group => group.rmsId);
            // Set all groups not in the list to inactive
            await Group.update({ rmsId: { not: rmsGroupIds } }).set({ isDeleted: true });
            for (const group of currentRMSGroupsFlatTree) {
                emitter.emit("rms-sync:before-each-group-item", group);
                // Update or create group
                const groupData = { ...group, isDeleted: false };
                await Group.createOrUpdate(groupData);
            }
            // Collect all product ids
            let allProductIds = [];
            for (const group of currentRMSGroupsFlatTree) {
                const productsToUpdate = await rmsAdapter.loadProductsByGroup(group);
                // Get ids of all current products in group
                const productIds = productsToUpdate.map(product => product.rmsId);
                allProductIds = allProductIds.concat(productIds);
                for (let product of productsToUpdate) {
                    emitter.emit("rms-sync:before-each-product-item", product);
                    // Update or create product
                    const productData = { ...product, isDeleted: false };
                    await Dish.createOrUpdate(productData);
                }
            }
            // Find all inactive groups
            const inactiveGroups = await Group.find({ isDeleted: true });
            const inactiveGroupIds = inactiveGroups.map(group => group.id);
            // Delete all dishes in inactive groups or not in the updated list
            await Dish.update({ where: { or: [{ groupId: { in: inactiveGroupIds } }, { rmsId: { not: allProductIds } }] } }).set({ isDeleted: true });
        }
        return;
    }
    ;
    /**
     * Synchronizing the balance of dishes with the RMS adapter
     */
    static syncOutOfStocks() {
        // Consider the concepts
        return;
    }
    ;
}
exports.default = RMSAdapter;
