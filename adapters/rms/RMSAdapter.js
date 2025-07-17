"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// todo: fix types model instance to {%ModelName%}Record for Order";
// todo: fix types model instance to {%ModelName%}Record for Dish";
// todo: fix types model instance to {%ModelName%}Record for Group";
const ObservablePromise_1 = require("../../libs/ObservablePromise");
/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */
class RMSAdapter {
    constructor(config) {
        this.config = {};
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
            const SYNC_PRODUCTS_INTERVAL_SECONDS = await Settings.get("SYNC_PRODUCTS_INTERVAL_SECONDS");
            if (RMSAdapter.syncProductsInterval)
                clearInterval(RMSAdapter.syncProductsInterval);
            RMSAdapter.syncProductsInterval = setInterval(async () => {
                await this.syncProducts();
            }, SYNC_PRODUCTS_INTERVAL_SECONDS < 120 ? 120000 : SYNC_PRODUCTS_INTERVAL_SECONDS * 1000 || 600000);
        }
        // Run on a load
        if (process.env.NODE_ENV !== "production") {
            await this.syncProducts();
        }
        // Run sync OutOfStock
        const NO_SYNC_OUT_OF_STOCKS = (await Settings.get("NO_SYNC_OUT_OF_STOCKS")) ?? false;
        if (!NO_SYNC_OUT_OF_STOCKS) {
            const SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS = await Settings.get("SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS");
            if (RMSAdapter.syncOutOfStocksInterval)
                clearInterval(RMSAdapter.syncOutOfStocksInterval);
            RMSAdapter.syncOutOfStocksInterval = setInterval(async () => {
                await this.syncOutOfStocks();
            }, SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS < 60 ? 60000 : SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS * 1000 || 600000);
        }
        // TODO: it here for fast, better way create new class/adapter for webhook handling
        emitter.on("core:adapter-rms-sync-out-of-stock-touch", "rms-adapter", async () => {
            await this.syncOutOfStocks();
        });
        try {
            await this.initialized();
        }
        catch (error) {
            sails.log.error("RMS initialized error >> ", error);
        }
    }
    /**
     * Menu synchronization with RMS system
     * At first, groups are synchronized, then dishes are synchronized for each of these groups.
     * When synchronizing groups, those groups not on the list will be turned off before the start of synchronization
     * Those dishes that are left without ties will be marked with isDeleted
     * There can be no dishes in the root.
     */
    async syncProducts(concept, force = false) {
        sails.log.silly("ADAPTER RMS > syncProducts");
        if (this.syncProductsPromise && this.syncProductsPromise.status === "pending") {
            sails.log.warn(`Method "syncProducts" was already executed and won't be executed again`);
            return this.syncProductsPromise.promise;
        }
        const promise = new Promise((resolve, reject) => {
            (async () => {
                try {
                    // TODO: implement concept
                    let rootGroupsToSync = await Settings.get("ROOT_GROUPS_RMS_TO_SYNC");
                    if (!rootGroupsToSync)
                        rootGroupsToSync = [];
                    const rmsAdapter = await Adapter.getRMSAdapter();
                    const nomenclatureHasUpdated = await rmsAdapter.nomenclatureHasUpdated();
                    sails.log.silly("ADAPTER RMS > syncProducts, nomenclatureHasUpdated", nomenclatureHasUpdated);
                    if (nomenclatureHasUpdated || force) {
                        sails.log.debug("ADAPTER RMS > syncProducts, nomenclatureHasUpdated", nomenclatureHasUpdated, "SYNC STARTED");
                        const currentRMSGroupsFlatTree = await rmsAdapter.loadNomenclatureTree(rootGroupsToSync);
                        // Get ids of all current RMS groups
                        const rmsGroupIds = currentRMSGroupsFlatTree.map((group) => group.rmsId);
                        // Set all groups not in the list to inactive
                        await Group.update({ where: { rmsId: { "!=": rmsGroupIds } } }, { isDeleted: true }).fetch();
                        sails.log.silly("ADAPTER RMS > syncProducts Groups:", JSON.stringify(rmsGroupIds));
                        for (const group of currentRMSGroupsFlatTree) {
                            emitter.emit("rms-sync:before-each-group-item", group);
                            group.concept = group.concept ?? "origin";
                            // Update or create a group
                            const groupData = { ...group, isDeleted: false };
                            await Group.createOrUpdate(groupData);
                        }
                        // Collect all product ids
                        let allProductRMSIds = [];
                        let allProductIds = [];
                        for (const group of currentRMSGroupsFlatTree) {
                            const productsToUpdate = await rmsAdapter.loadProductsByGroup(group);
                            // Get ids of all current products in a group
                            const productIds = productsToUpdate.map((product) => product.id);
                            allProductIds = allProductIds.concat(productIds);
                            // allProductRMSIds = allProductRMSIds.concat(productRMSIds);
                            for (let product of productsToUpdate) {
                                emitter.emit("rms-sync:before-each-product-item", product);
                                // Update or create product
                                product.concept = product.concept ?? "origin";
                                let createdProduct = await Dish.createOrUpdate(product);
                                // Set isDeleted for absent products in ERP
                                await Dish.update({ id: { "!=": allProductIds } }, { isDeleted: true }).fetch();
                                sails.log.silly(`ADAPTER RMS > syncProducts sync Group [${group.id}] '${group.name}' dishes:`, JSON.stringify(productIds));
                                const SKIP_LOAD_PRODUCT_IMAGES = (await Settings.get("SKIP_LOAD_PRODUCT_IMAGES")) ?? false;
                                const DELETE_EXISTING_IMAGES_BEFORE_SYNC = (await Settings.get("DELETE_EXISTING_IMAGES_BEFORE_SYNC")) ?? false;
                                // Load images
                                if (product.images && product.images.length && !SKIP_LOAD_PRODUCT_IMAGES) {
                                    // Delete existing images if setting is enabled
                                    if (DELETE_EXISTING_IMAGES_BEFORE_SYNC) {
                                        await SelectedMediaFile.destroy({ dish: createdProduct.id }).fetch();
                                        sails.log.silly(`Deleted existing images for dish ${createdProduct.id} before sync`);
                                    }
                                    const isURL = (str) => /^(https?:\/\/|file:\/\/).+/.test(str);
                                    for (let image of product.images) {
                                        if (isURL(image)) {
                                            // load image
                                            const mfAdater = await Adapter.getMediaFileAdapter();
                                            const mediaFileImage = await mfAdater.toProcess(image, "dish", "image");
                                            // await Dish.addToCollection(createdProduct.id, "images").members([mediaFileImage.id]);
                                            const model = 'dish';
                                            let init = {};
                                            init[`mediafile_${model}`] = mediaFileImage.id;
                                            init[model] = createdProduct.id;
                                            init["sortOrder"] = 0;
                                            await SelectedMediaFile.create(init).fetch();
                                        }
                                        else {
                                            sails.log.silly(`Image not url on sync products ${image}`);
                                            continue;
                                        }
                                    }
                                }
                            }
                        } // end of groups loop
                        // Find all inactive groups
                        const inactiveGroups = await Group.find({ isDeleted: true });
                        const inactiveGroupIds = inactiveGroups.map((group) => group.id);
                        // Delete all dishes in inactive groups or not in the updated list
                        await Dish.update({
                            where: { or: [
                                    { parentGroup: { in: inactiveGroupIds } },
                                    { id: { nin: allProductIds } },
                                    { parentGroup: null }
                                ]
                            }
                        }, { isDeleted: true }).fetch();
                        await Dish.update({ id: { in: allProductIds } }, { isDeleted: false }).fetch();
                        emitter.emit("rms-sync:after-sync-products");
                    }
                    resolve();
                }
                catch (error) {
                    sails.log.error(`RMS adapter syncProducts error:`, error);
                    reject(new Error(error));
                }
            })();
        });
        this.syncProductsPromise = new ObservablePromise_1.ObservablePromise(promise);
        return promise;
    }
    /**
     * Synchronizing the balance of dishes with the RMS adapter
     */
    async syncOutOfStocks() {
        sails.log.silly("ADAPTER RMS > syncOutOfStocks");
        if (this.syncOutOfStocksPromise && this.syncOutOfStocksPromise.status === "pending") {
            sails.log.warn(`Method "syncOutOfStocks" was already executed and won't be executed again`);
            return this.syncOutOfStocksPromise.promise;
        }
        const promise = new Promise((resolve, reject) => {
            (async () => {
                try {
                    let outOfStocksDishes = await this.loadOutOfStocksDishes();
                    const outOfStocksDishesIds = outOfStocksDishes.map(d => d.rmsId);
                    await Dish.update({
                        rmsId: { nin: outOfStocksDishesIds },
                        balance: { '!=': -1 }
                    }, { balance: -1 }).fetch();
                    for (let item of outOfStocksDishes) {
                        emitter.emit("rms-sync:out-of-stocks-before-each-product-item", item);
                        await Dish.update({ rmsId: item.rmsId }, { balance: item.balance }).fetch();
                    }
                    resolve();
                }
                catch (error) {
                    sails.log.error(`RMS adapter syncOutOfStocks error:`, error);
                    reject(new Error(error));
                }
            })();
        });
        this.syncOutOfStocksPromise = new ObservablePromise_1.ObservablePromise(promise);
        return promise;
    }
}
exports.default = RMSAdapter;
