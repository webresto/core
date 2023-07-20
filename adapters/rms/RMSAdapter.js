"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */
class RMSAdapter {
    constructor(config) {
        this.config = {};
        this.syncProductsExecuted = false;
        this.config = config;
        // Run async initialization
        this.initializationPromise = this.initialize();
    }
    /**
     * Waiting for initialization
     */
    async wait() {
        await this.initializationPromise;
    }
    async initialize() {
        // Run product sync interval
        const NO_SYNC_NOMENCLATURE = await Settings.get("NO_SYNC_NOMENCLATURE") ?? false;
        if (!NO_SYNC_NOMENCLATURE) {
            const SYNC_PRODUCTS_INTERVAL_SECOUNDS = await Settings.get("SYNC_PRODUCTS_INTERVAL_SECOUNDS");
            if (RMSAdapter.syncProductsInterval)
                clearInterval(RMSAdapter.syncProductsInterval);
            RMSAdapter.syncProductsInterval = setInterval(async () => {
                this.syncProducts();
            }, SYNC_PRODUCTS_INTERVAL_SECOUNDS < 120 ? 120000 : SYNC_PRODUCTS_INTERVAL_SECOUNDS * 1000 || 120000);
        }
        // Run sync OutOfStock
        const NO_SYNC_OUT_OF_STOCKS = await Settings.get("NO_SYNC_OUT_OF_STOCKS") ?? false;
        if (!NO_SYNC_OUT_OF_STOCKS) {
            const SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS = await Settings.get("SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS");
            if (RMSAdapter.syncOutOfStocksInterval)
                clearInterval(RMSAdapter.syncOutOfStocksInterval);
            RMSAdapter.syncOutOfStocksInterval = setInterval(async () => {
                this.syncOutOfStocks();
            }, SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS < 60 ? 60000 : SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS * 1000 || 60000);
        }
        await this.customInitialize();
    }
    /**
     * Menu synchronization with RMS system
     * At first, groups are synchronized, then dishes are synchronized for each of these groups.
     * When synchronizing groups, those groups that were not on the list will be turned off before the start of synchronization
     * Those dishes that are left without ties will be marked with isDeleted
     * There can be no dishes in the root.
     */
    async syncProducts(concept, force = false) {
        // TODO: implement concept 
        if (this.syncProductsExecuted) {
            sails.log.info(`Method "syncProducts" was already executed and won't be executed again`);
            return;
        }
        this.syncProductsExecuted = true;
        const rootGroupsToSync = await Settings.get("ROOT_GROUPS_RMS_TO_SYNC");
        const rmsAdapter = await Adapter.getRMSAdapter();
        if (await rmsAdapter.nomenclatureHasUpdated() || force) {
            const currentRMSGroupsFlatTree = await rmsAdapter.loadNomenclatureTree(rootGroupsToSync);
            // Get ids of all current RMS groups
            const rmsGroupIds = currentRMSGroupsFlatTree.map(group => group.rmsId);
            // Set all groups not in the list to inactive
            await Group.update({ where: { rmsId: { not: rmsGroupIds } } }, { isDeleted: true }).fetch();
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
            await Dish.update({ where: { or: [{ parentGroup: { in: inactiveGroupIds } }, { rmsId: { not: allProductIds } }, { parentGroup: null }] } }, { isDeleted: true });
        }
        this.syncProductsExecuted = false;
        return;
    }
    ;
    /**
     * Synchronizing the balance of dishes with the RMS adapter
     */
    async syncOutOfStocks() {
        // Consider the concepts
        return;
    }
    ;
}
exports.default = RMSAdapter;
