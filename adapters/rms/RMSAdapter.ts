// todo: fix types model instance to {%ModelName%}Record for Order";
// todo: fix types model instance to {%ModelName%}Record for Dish";
// todo: fix types model instance to {%ModelName%}Record for Group";
// todo: fix types model instance to {%ModelName%}Record for SelectedMediaFile";
import { ObservablePromise } from "../../libs/ObservablePromise";
import { DishRecord } from "../../models/Dish";
import { GroupRecord } from "../../models/Group";
import { OrderRecord } from "../../models/Order";
import { SelectedMediaFileRecord } from "../../models/SelectedMediaFile";
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

  private async writeLastSuccessfulSyncDate(settingKey: "RMS_LAST_SUCCESSFUL_MENU_DISHES_SYNC_AT" | "RMS_LAST_SUCCESSFUL_STOPLISTS_SYNC_AT"): Promise<void> {
    await Settings.set(settingKey, {
      key: settingKey,
      value: new Date().toISOString()
    });
  }

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
    const NO_SYNC_NOMENCLATURE = (await Settings.get("NO_SYNC_NOMENCLATURE")) ?? false;
    if (!NO_SYNC_NOMENCLATURE) {
      const SYNC_PRODUCTS_INTERVAL_SECONDS = await Settings.get("SYNC_PRODUCTS_INTERVAL_SECONDS");
      if (RMSAdapter.syncProductsInterval) clearInterval(RMSAdapter.syncProductsInterval);
      RMSAdapter.syncProductsInterval = setInterval(
        async () => {
          await this.syncProducts();
        },
        SYNC_PRODUCTS_INTERVAL_SECONDS < 120 ? 120000 : SYNC_PRODUCTS_INTERVAL_SECONDS * 1000 || 600000
      );
    }

    // Run on a load
    if (process.env.NODE_ENV !== "production") {
      await this.syncProducts();
    }

    // Run sync OutOfStock
    const NO_SYNC_OUT_OF_STOCKS = (await Settings.get("NO_SYNC_OUT_OF_STOCKS")) ?? false;
    if (!NO_SYNC_OUT_OF_STOCKS) {
      const SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS = await Settings.get("SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS");
      if (RMSAdapter.syncOutOfStocksInterval) clearInterval(RMSAdapter.syncOutOfStocksInterval);
      RMSAdapter.syncOutOfStocksInterval = setInterval(
        async () => {
          await this.syncOutOfStocks();
        },
        SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS < 60 ? 60000 : SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS * 1000 || 600000
      );
    }

    // TODO: it here for fast, better way create new class/adapter for webhook handling
    emitter.on("core:adapter-rms-sync-out-of-stock-touch", "rms-adapter", async () => {
      await this.syncOutOfStocks();
    })

    try {
      await this.initialized();
    } catch (error) {
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
  public async syncProducts(concept?: string, force: boolean = false): Promise<void> {
    sails.log.silly("ADAPTER RMS > syncProducts");
    if (this.syncProductsPromise && this.syncProductsPromise.status === "pending") {
      sails.log.warn(`Method "syncProducts" was already executed and won't be executed again`);
      return this.syncProductsPromise.promise;
    }

    const promise = new Promise<void>((resolve, reject) => {
      (async () => {
        try {
          // TODO: implement concept

          let rootGroupsToSync = await Settings.get("ROOT_GROUPS_RMS_TO_SYNC");
          if (!rootGroupsToSync) rootGroupsToSync = [];
          
          const VISIBLE_BY_DEFAULT_ON_SYNC = (await Settings.get("VISIBLE_BY_DEFAULT_ON_SYNC")) ?? true;
          const ENABLE_BY_DEFAULT_ON_SYNC = (await Settings.get("ENABLE_BY_DEFAULT_ON_SYNC")) ?? true;

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

            sails.log.silly("ADAPTER RMS > syncProducts Groups:", JSON.stringify(rmsGroupIds))

            for (const group of currentRMSGroupsFlatTree) {
              emitter.emit("rms-sync:before-each-group-item", group);
              group.concept = group.concept ?? "origin"
              
              if (group.visible === undefined) {
                group.visible = VISIBLE_BY_DEFAULT_ON_SYNC;
              }

              if (group.enable === undefined) {
                group.enable = ENABLE_BY_DEFAULT_ON_SYNC;
              }

              // Update or create a group
              const groupData = { ...group, isDeleted: false };
              await Group.createOrUpdate(groupData);
            }

            // Collect all product ids
            let allProductRMSIds: string[] = [];
            let allProductIds: string[] = [];

            const SKIP_LOAD_PRODUCT_IMAGES = (await Settings.get("SKIP_LOAD_PRODUCT_IMAGES")) ?? false;
            const DELETE_EXISTING_IMAGES_BEFORE_SYNC = (await Settings.get("DELETE_EXISTING_IMAGES_BEFORE_SYNC")) ?? false;
            const mfAdapter = await Adapter.getMediaFileAdapter();
            const isURL = (str: string) => /^(https?:\/\/|file:\/\/).+/.test(str);

            for (const group of currentRMSGroupsFlatTree) {
              const productsToUpdate = await rmsAdapter.loadProductsByGroup(group);

              // Get ids of all current products in a group
              const productIds = productsToUpdate.map((product) => product.id);
              allProductIds = allProductIds.concat(productIds);

              for (let product of productsToUpdate) {

                emitter.emit("rms-sync:before-each-product-item", product);

                product.concept = product.concept ?? "origin"

                if (product.visible === undefined) {
                  product.visible = VISIBLE_BY_DEFAULT_ON_SYNC;
                }

                if (product.enable === undefined) {
                  product.enable = ENABLE_BY_DEFAULT_ON_SYNC;
                }

                let createdProduct = await Dish.createOrUpdate(product);

                // Set isDeleted for absent products in ERP
                await Dish.update({id: { "!=": allProductIds }}, {isDeleted: true}).fetch();
                sails.log.silly(`ADAPTER RMS > syncProducts sync Group [${group.id}] '${group.name}' dishes:`, JSON.stringify(productIds))

                if (product.images && product.images.length && !SKIP_LOAD_PRODUCT_IMAGES) {
                  // Delete existing images if setting is enabled
                  if (DELETE_EXISTING_IMAGES_BEFORE_SYNC) {
                    await SelectedMediaFile.destroy({ dish: createdProduct.id }).fetch();
                    sails.log.silly(`Deleted existing images for dish ${createdProduct.id} before sync`);
                  }

                  const seenMediaFiles = new Set<string>(
                    DELETE_EXISTING_IMAGES_BEFORE_SYNC
                      ? []
                      : (await SelectedMediaFile.find({ dish: createdProduct.id }))
                          .map((r) => r.mediafile_dish as string | undefined)
                          .filter((id): id is string => Boolean(id))
                  );

                  for (const image of product.images as string[]) {
                    if (!isURL(image)) {
                      sails.log.silly(`Image not url on sync products ${image}`);
                      continue;
                    }
                    // Reuse the same media file for identical URLs and avoid duplicate dish relations.
                    const mediaFile = await mfAdapter.toProcess(image, "dish", "image");
                    if (seenMediaFiles.has(mediaFile.id)) continue;

                    await SelectedMediaFile.create({
                      mediafile_dish: mediaFile.id,
                      dish: createdProduct.id,
                      sortOrder: 0,
                    } as Partial<SelectedMediaFileRecord> & Record<string, string | number>).fetch();
                    seenMediaFiles.add(mediaFile.id);
                  }
                }

              }
            } // end of groups loop

            // Find all inactive groups
            const inactiveGroups = await Group.find({ isDeleted: true });
            const inactiveGroupIds = inactiveGroups.map((group: GroupRecord) => group.id);

            // Delete all dishes in inactive groups or not in the updated list
            await Dish.update({ 
              where: { or: 
                [
                  { parentGroup: { in: inactiveGroupIds } }, 
                  { id: { nin: allProductIds } }, 
                  { parentGroup: null }
                ] 
              } 
              }, 
              { isDeleted: true }
            ).fetch();

            await Dish.update({id: { in: allProductIds }}, {isDeleted: false}).fetch();
            await this.writeLastSuccessfulSyncDate("RMS_LAST_SUCCESSFUL_MENU_DISHES_SYNC_AT");
            emitter.emit("rms-sync:after-sync-products");
          }
          resolve();
        } catch (error) {
          sails.log.error(`RMS adapter syncProducts error:`, error);
          reject(new Error(error));
        }
      })();
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

    const promise = new Promise<void>((resolve, reject) => {
      (async () => {
        try {
          let outOfStocksDishes = await this.loadOutOfStocksDishes();
          const outOfStocksDishesIds = outOfStocksDishes.map(d => d.rmsId);

          await Dish.update({
            rmsId: { nin: outOfStocksDishesIds },
            balance: { '!=': -1 }
          }, { balance: -1 }).fetch()

          for(let item of outOfStocksDishes) {
            emitter.emit("rms-sync:out-of-stocks-before-each-product-item", item);
            await Dish.update({rmsId: item.rmsId}, {balance: item.balance}).fetch()
          }
          await this.writeLastSuccessfulSyncDate("RMS_LAST_SUCCESSFUL_STOPLISTS_SYNC_AT");
          emitter.emit("rms-sync:after-sync-out-of-stocks");
          resolve();
        } catch (error) {
          sails.log.error(`RMS adapter syncOutOfStocks error:`, error);
          reject(new Error(error));
        }
      })();
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
  protected abstract loadNomenclatureTree(rmsGroupIds?: string[]): Promise<GroupRecord[]>;

  protected abstract loadProductsByGroup(group: GroupRecord): Promise<DishRecord[]>;

  protected abstract loadOutOfStocksDishes(concept?: string): Promise<Pick<DishRecord, "balance" | "rmsId">[]>;

  /**
   * Create an order
   * @param orderData - webresto order
   * @return Order response
   */
  public abstract createOrder(orderData: OrderRecord): Promise<OrderRecord>;

  /**
   * Order check before order
   * @param orderData - webresto order
   * @return Order response
   */
  public abstract checkOrder(orderData: OrderRecord): Promise<OrderRecord>;

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
