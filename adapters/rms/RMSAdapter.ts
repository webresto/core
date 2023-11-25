import Order from "../../models/Order";
import Dish from "../../models/Dish";
import Group from "../../models/Group";
import { ObservablePromise } from "../../libs/ObservablePromise";
export type ConfigRMSAdapter = {
  [key: string]: ConfigRMSAdapter | number | boolean | string | null | undefined;
};

/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */

export default abstract class RMSAdapter {
  public readonly config: ConfigRMSAdapter = {};

  private static syncProductsInterval: ReturnType<typeof setInterval>;
  private static syncOutOfStocksInterval: ReturnType<typeof setInterval>;
  private initializationPromise: Promise<void>;

  private syncProductsPromise: ObservablePromise<void>;
  private syncOutOfStocksPromise: ObservablePromise<void>;

  public constructor(config?: ConfigRMSAdapter) {
    this.config = config;

    // Run async initialization
    this.initializationPromise = this.initialize();
  }

  /**
   * Waiting for initialization
   */
  public async wait(): Promise<void> {
    await this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    try {
      await this.customInitialize();
    } catch (error) {
      sails.log.error("RMS inittialization error >> ", error);
      return;
    }

    // Run product sync interval
    const NO_SYNC_NOMENCLATURE = ((await Settings.get("NO_SYNC_NOMENCLATURE")) as boolean) ?? false;
    if (!NO_SYNC_NOMENCLATURE) {
      const SYNC_PRODUCTS_INTERVAL_SECOUNDS = (await Settings.get("SYNC_PRODUCTS_INTERVAL_SECOUNDS")) as number;
      if (RMSAdapter.syncProductsInterval) clearInterval(RMSAdapter.syncProductsInterval);
      RMSAdapter.syncProductsInterval = setInterval(
        async () => {
          await this.syncProducts();
        },
        SYNC_PRODUCTS_INTERVAL_SECOUNDS < 120 ? 120000 : SYNC_PRODUCTS_INTERVAL_SECOUNDS * 1000 || 120000
      );
    }

    // Run on load
    if (process.env.NODE_ENV !== "production") {
      await this.syncProducts();
    }

    // Run sync OutOfStock
    const NO_SYNC_OUT_OF_STOCKS = ((await Settings.get("NO_SYNC_OUT_OF_STOCKS")) as boolean) ?? false;
    if (!NO_SYNC_OUT_OF_STOCKS) {
      const SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS = (await Settings.get("SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS")) as number;
      if (RMSAdapter.syncOutOfStocksInterval) clearInterval(RMSAdapter.syncOutOfStocksInterval);
      RMSAdapter.syncOutOfStocksInterval = setInterval(
        async () => {
          await this.syncOutOfStocks();
        },
        SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS < 60 ? 60000 : SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS * 1000 || 60000
      );
    }

    try {
      await this.initialized();
    } catch (error) {
      sails.log.error("RMS initialized error >> ", error);
    }
  }

  /**
   * Menu synchronization with RMS system
   * At first, groups are synchronized, then dishes are synchronized for each of these groups.
   * When synchronizing groups, those groups that were not on the list will be turned off before the start of synchronization
   * Those dishes that are left without ties will be marked with isDeleted
   * There can be no dishes in the root.
   */
  public async syncProducts(concept?: string, force: boolean = false): Promise<void> {
    sails.log.silly("ADAPTER RMS > syncProducts");
    if (this.syncProductsPromise && this.syncProductsPromise.status === "pending") {
      sails.log.warn(`Method "syncProducts" was already executed and won't be executed again`);
      return this.syncProductsPromise.promise;
    }

    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        // TODO: implement concept
        
        let rootGroupsToSync = (await Settings.get("ROOT_GROUPS_RMS_TO_SYNC")) as string | string[];
        if (typeof rootGroupsToSync === "string") rootGroupsToSync = rootGroupsToSync.split(";");
        if (!rootGroupsToSync) rootGroupsToSync = [];

        const rmsAdapter = await Adapter.getRMSAdapter();
        

        const nomenclatureHasUpdated = await rmsAdapter.nomenclatureHasUpdated()
        sails.log.silly("ADAPTER RMS > syncProducts, nomenclatureHasUpdated", nomenclatureHasUpdated);
        if ( nomenclatureHasUpdated || force) {
          sails.log.debug("ADAPTER RMS > syncProducts, nomenclatureHasUpdated", nomenclatureHasUpdated, "SYNC STARTED");
          const currentRMSGroupsFlatTree = await rmsAdapter.loadNomenclatureTree(rootGroupsToSync);

          // Get ids of all current RMS groups
          const rmsGroupIds = currentRMSGroupsFlatTree.map((group) => group.rmsId);

          // Set all groups not in the list to inactive
          await Group.update({ where: { rmsId: { "!=": rmsGroupIds } } }, { isDeleted: true }).fetch();
          
          sails.log.debug("ADAPTER RMS > syncProducts Groups:", currentRMSGroupsFlatTree.length)

          for (const group of currentRMSGroupsFlatTree) {
            emitter.emit("rms-sync:before-each-group-item", group);
            group.concept = group.concept ?? "origin"
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
            
            sails.log.silly("ADAPTER RMS > syncProducts sync Group dishes:", productsToUpdate.length)
            for (let product of productsToUpdate) {
              
              emitter.emit("rms-sync:before-each-product-item", product);
              
              // Update or create product
              product.concept = product.concept ?? "origin"
              const productData = { ...product, isDeleted: false };
              let createdProduct = await Dish.createOrUpdate(productData);

              const SKIP_LOAD_PRODUCT_IMAGES = ((await Settings.get("SKIP_LOAD_PRODUCT_IMAGES")) as boolean) ?? false;
              // Load images
              if (product.images && product.images.length && !SKIP_LOAD_PRODUCT_IMAGES) {
                const isURL = (str) => /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=]+$/.test(str);
                for (let image of product.images) {
                  if (isURL(image)) {
                    // load image
                    const mfAdater = await Adapter.getMediaFileAdapter();
                    const mediaFileImage = await mfAdater.toDownload(image as string, "dish", "image");
                    await Dish.addToCollection(createdProduct.id, "images").members([mediaFileImage.id]);
                  } else {
                    sails.log.silly(`Image not url on sync products ${image}`);
                    continue;
                  }
                }
              }

            }
          }

          // Find all inactive groups
          const inactiveGroups = await Group.find({ isDeleted: true });
          const inactiveGroupIds = inactiveGroups.map((group) => group.id);

          // Delete all dishes in inactive groups or not in the updated list
          await Dish.update({ where: { or: [{ parentGroup: { in: inactiveGroupIds } }, { rmsId: { "!=": allProductIds } }, { parentGroup: null }] } }, { isDeleted: true });
          emitter.emit("rms-sync:after-sync-products");
        }
        return resolve();
      } catch (error) {
        sails.log.error(`RMS adapter syncProducts error:`, error);
        return reject(error);
      }

    });
    this.syncProductsPromise = new ObservablePromise(promise)
    return promise;
  }

  /**
   * Synchronizing the balance of dishes with the RMS adapter
   */
  public async syncOutOfStocks(): Promise<void> {
    sails.log.silly("ADAPTER RMS > syncOutOfStocks")
    if (this.syncOutOfStocksPromise && this.syncOutOfStocksPromise.status === "pending") {
      sails.log.warn(`Method "syncOutOfStocks" was already executed and won't be executed again`);
      return this.syncOutOfStocksPromise.promise;
    }
    
    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        let outOfStocksDishes = await this.loadOutOfStocksDishes();
    
        for(let item of outOfStocksDishes) {
          emitter.emit("rms-sync-out-of-stocks:before-each-product-item", item);
          await Dish.update({rmsId: item.rmsId}, {balance: Math.round(item.balance)}).fetch()
        }
        return resolve();
      } catch (error) {
        sails.log.error(`RMS adapter syncOutOfStocks error:`, error);
        return reject(error);
      }
    });

    this.syncOutOfStocksPromise = new ObservablePromise(promise)
    return promise;
  }

  /**
   * This method will call before the main initialization
   * @returns boolean
   */
  protected abstract customInitialize(): Promise<void>;


  /**
   * This method will call after the main initialization
   * @returns boolean
   */
    protected abstract initialized(): Promise<void>;

  /**
   * Checks whether the nomenclature was updated if the last time something has changed will return to True
   * @returns boolean
   */
  protected abstract nomenclatureHasUpdated(): Promise<boolean>;

  /**
   *
   * @returns
   */
  protected abstract loadNomenclatureTree(rmsGroupIds?: string[]): Promise<Group[]>;

  protected abstract loadProductsByGroup(group: Group): Promise<Dish[]>;

  protected abstract loadOutOfStocksDishes(concept?: string): Promise<Pick<Dish, "balance" | "rmsId">[]>;

  /**
   * Create an order
   * @param orderData - webresto order
   * @return Order response
   */
  public abstract createOrder(orderData: Order): Promise<Order>;

  /**
   * Order check before order
   * @param orderData - webresto order
   * @return Order response
   */
  public abstract checkOrder(orderData: Order): Promise<Order>;

  // /**
  //  * Getting system information
  //  * @return RMS system information
  //  */
  // public abstract getSystemData(): Promise<any>;

  /**
   * Direct request to the RMS API
   * @param method - method name
   * @param params - params
   * @return
   */
  public abstract api(method: string, params: any): Promise<any>;

  /**
   * Method for creating and getting an already existing RMS adapter
   * @param params - parameters for initialization
   */
}
