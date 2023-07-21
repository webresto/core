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
        try {
            await this.customInitialize();
        }
        catch (error) {
            sails.log.error("RMS inittialization error >> ", error);
            return;
        }
        // Run product sync interval
        const NO_SYNC_NOMENCLATURE = (await Settings.get("NO_SYNC_NOMENCLATURE")) ?? false;
        if (!NO_SYNC_NOMENCLATURE) {
            const SYNC_PRODUCTS_INTERVAL_SECOUNDS = (await Settings.get("SYNC_PRODUCTS_INTERVAL_SECOUNDS"));
            if (RMSAdapter.syncProductsInterval)
                clearInterval(RMSAdapter.syncProductsInterval);
            RMSAdapter.syncProductsInterval = setInterval(async () => {
                this.syncProducts();
            }, SYNC_PRODUCTS_INTERVAL_SECOUNDS < 120 ? 120000 : SYNC_PRODUCTS_INTERVAL_SECOUNDS * 1000 || 120000);
        }
        // Run on load
        if (process.env.NODE_ENV !== "production") {
            this.syncProducts();
        }
        // Run sync OutOfStock
        const NO_SYNC_OUT_OF_STOCKS = (await Settings.get("NO_SYNC_OUT_OF_STOCKS")) ?? false;
        if (!NO_SYNC_OUT_OF_STOCKS) {
            const SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS = (await Settings.get("SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS"));
            if (RMSAdapter.syncOutOfStocksInterval)
                clearInterval(RMSAdapter.syncOutOfStocksInterval);
            RMSAdapter.syncOutOfStocksInterval = setInterval(async () => {
                this.syncOutOfStocks();
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
    async syncProducts(concept, force = false) {
        if (this.syncProductsExecuted) {
            sails.log.silly(`Method "syncProducts" was already executed and won't be executed again`);
            return this.syncProductsPromise;
        }
        this.syncProductsPromise = new Promise(async (resolve, reject) => {
            try {
                // TODO: implement concept
                this.syncProductsExecuted = true;
                let rootGroupsToSync = (await Settings.get("ROOT_GROUPS_RMS_TO_SYNC"));
                if (typeof rootGroupsToSync === "string")
                    rootGroupsToSync = rootGroupsToSync.split(";");
                if (!rootGroupsToSync)
                    rootGroupsToSync = [];
                const rmsAdapter = await Adapter.getRMSAdapter();
                if ((await rmsAdapter.nomenclatureHasUpdated()) || force) {
                    const currentRMSGroupsFlatTree = await rmsAdapter.loadNomenclatureTree(rootGroupsToSync);
                    // Get ids of all current RMS groups
                    const rmsGroupIds = currentRMSGroupsFlatTree.map((group) => group.rmsId);
                    // Set all groups not in the list to inactive
                    await Group.update({ where: { rmsId: { "!=": rmsGroupIds } } }, { isDeleted: true }).fetch();
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
                        const productIds = productsToUpdate.map((product) => product.rmsId);
                        allProductIds = allProductIds.concat(productIds);
                        for (let product of productsToUpdate) {
                            emitter.emit("rms-sync:before-each-product-item", product);
                            const SKIP_LOAD_PRODUCT_IMAGES = (await Settings.get("SKIP_LOAD_PRODUCT_IMAGES")) ?? false;
                            // Load images
                            if (product.images && product.images.length && !SKIP_LOAD_PRODUCT_IMAGES) {
                                const isURL = (str) => /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=]+$/.test(str);
                                for (let image of product.images) {
                                    if (isURL(image)) {
                                        // load image
                                        const mfAdater = await Adapter.getMediaFileAdapter();
                                        const mediaFileImage = await mfAdater.toDownload(image, "dish", "image");
                                        await Dish.addToCollection(product.id, "images").members([mediaFileImage.id]);
                                    }
                                    else {
                                        sails.log.debug(`Image not url on sync products ${image}`);
                                        continue;
                                    }
                                }
                            }
                            // Update or create product
                            const productData = { ...product, isDeleted: false };
                            await Dish.createOrUpdate(productData);
                        }
                    }
                    // Find all inactive groups
                    const inactiveGroups = await Group.find({ isDeleted: true });
                    const inactiveGroupIds = inactiveGroups.map((group) => group.id);
                    // Delete all dishes in inactive groups or not in the updated list
                    await Dish.update({ where: { or: [{ parentGroup: { in: inactiveGroupIds } }, { rmsId: { "!=": allProductIds } }, { parentGroup: null }] } }, { isDeleted: true });
                }
                this.syncProductsExecuted = false;
                return resolve();
            }
            catch (error) {
                return reject(error);
            }
        });
        return this.syncProductsPromise;
    }
    /**
     * Synchronizing the balance of dishes with the RMS adapter
     */
    async syncOutOfStocks() {
        // Consider the concepts
        return;
    }
}
exports.default = RMSAdapter;
