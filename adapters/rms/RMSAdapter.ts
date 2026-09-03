// todo: fix types model instance to {%ModelName%}Record for Order";
// todo: fix types model instance to {%ModelName%}Record for Dish";
// todo: fix types model instance to {%ModelName%}Record for Group";
// todo: fix types model instance to {%ModelName%}Record for SelectedMediaFile";
import { ObservablePromise } from "../../libs/ObservablePromise";
import { DishRecord } from "../../models/Dish";
import { GroupRecord } from "../../models/Group";
import { OrderRecord } from "../../models/Order";
import { SelectedMediaFileRecord } from "../../models/SelectedMediaFile";
import { getEnabledCookingPlaceIds } from "../../lib/cooking-place";
import { UNLIMITED_BALANCE } from "../../lib/dish-place-balance";
export type ConfigRMSAdapter = {
  [key: string]: ConfigRMSAdapter | number | boolean | string | null | undefined;
};

/**
 * One product of an RMS stop list snapshot.
 *
 * Field names match what adapters have always returned; only the declaration
 * moved here, because the stock column it used to point at is gone from `Dish`.
 */
export interface RMSOutOfStockItem {
  rmsId: string;
  balance: number;
  /**
   * Whether the RMS says this product is on at the point.
   *
   * Optional, and the absence is meaningful: turning a product on and off is the
   * operator's call, and the RMS overrules them only by saying so. A snapshot
   * that omits the field leaves whatever the operator set. There is deliberately
   * no default — "not sent" and `false` are different statements.
   */
  enable?: boolean;
}

/** A stop list snapshot of one RMS terminal, addressed by `Place.rmsId`. */
export interface RMSPlaceOutOfStockSnapshot {
  placeRmsId: string;
  items: RMSOutOfStockItem[];
}

/** What `rms-sync:out-of-stocks-before-each-product-item` carries. */
export interface RMSOutOfStockEventItem extends RMSOutOfStockItem {
  /** The point the value was applied to; absent for a snapshot without terminals. */
  placeId?: string;
}

/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */

export default abstract class RMSAdapter {
  public readonly config: ConfigRMSAdapter = {};

  /**
   * Whether this RMS reports stock per terminal.
   *
   * `false` means one snapshot describes the whole install, so it covers every
   * enabled cooking point — the behaviour every existing adapter already has.
   */
  public readonly supportsPlaceBalances: boolean = false;

  /**
   * Whether this RMS can take one order cooked at several kitchens.
   *
   * `false` — the default, and the answer for every adapter written before this
   * existed. Core refuses such an order at checkout rather than sending it: an
   * RMS that cannot split it would either reject the whole thing or, worse,
   * accept it as one kitchen's work and let a customer wait for food nobody is
   * making. Falling back to a single kitchen silently is the one thing the plan
   * names as forbidden here, because it turns a configuration problem into a
   * lost order that looks fine on every screen.
   */
  public readonly supportsMultiKitchen: boolean = false;

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
          try {
            await this.syncProducts();
          } catch (error) {
            sails.log.error("RMS syncProducts interval error >> ", error);
          }
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
          try {
            await this.syncOutOfStocks();
          } catch (error) {
            sails.log.error("RMS syncOutOfStocks interval error >> ", error);
          }
        },
        SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS < 60 ? 60000 : SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS * 1000 || 600000
      );
    }

    // TODO: it here for fast, better way create new class/adapter for webhook handling
    emitter.on("core:adapter-rms-sync-out-of-stock-touch", "rms-adapter", async () => {
      try {
        await this.syncOutOfStocks();
      } catch (error) {
        sails.log.error("RMS sync-out-of-stock-touch handler error >> ", error);
      }
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

    const promise = new Promise<void>((resolve) => {
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

              // If sync default is enabled, explicitly enable imported groups.
              // If sync default is disabled, do not touch the enable field at all.
              // NOTE: This branch only defines behavior when RMS omits `enable`.
              // If RMS starts sending `enable` explicitly, that value will still be
              // passed through createOrUpdate() and may overwrite the current state.
              // That case is not handled here and must be reviewed separately.
              if (group.enable === undefined && ENABLE_BY_DEFAULT_ON_SYNC === true) {
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

                // If sync default is enabled, explicitly enable imported dishes.
                // If sync default is disabled, do not touch the enable field at all.
                // NOTE: This branch only defines behavior when RMS omits `enable`.
                // If RMS starts sending `enable` explicitly, that value will still be
                // passed through createOrUpdate() and may overwrite the current state.
                // That case is not handled here and must be reviewed separately.
                if (product.enable === undefined && ENABLE_BY_DEFAULT_ON_SYNC === true) {
                  product.enable = ENABLE_BY_DEFAULT_ON_SYNC;
                }

                let createdProduct = await Dish.createOrUpdate(product);

                // Set isDeleted for absent products in RMS
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
          // Background sync must never reject: nobody is guaranteed to .catch()
          // this promise (interval tick / ObservablePromise), so a rejection
          // becomes unhandled and kills the process. The next tick will retry.
          sails.log.error(`RMS adapter syncProducts error:`, error);
          resolve();
        }
      })();
    });
    this.syncProductsPromise = new ObservablePromise(promise)
    return promise;
  }

  /**
   * Loads the stop list snapshot and groups it by the points it covers.
   *
   * An RMS that knows nothing about terminals sends one snapshot for the whole
   * install, so it covers every enabled cooking point. An RMS that does send
   * terminals covers only the points its snapshot names: resetting the others
   * would let a sync of one kitchen lift the limits of another.
   */
  private async loadOutOfStocksByPlace(): Promise<Map<string, RMSOutOfStockItem[]>> {
    const byPlace = new Map<string, RMSOutOfStockItem[]>();

    if (this.supportsPlaceBalances) {
      const snapshots = await this.loadOutOfStocksDishesByPlace();
      if (snapshots) {
        const places = await Place.find({});
        const placeByRmsId = new Map<string, string>();
        for (const place of places) {
          const rmsId = typeof place.rmsId === "string" ? place.rmsId.trim() : "";
          if (rmsId && place.isCookingPoint === true && place.enable !== false) {
            placeByRmsId.set(rmsId, String(place.id));
          }
        }

        for (const snapshot of snapshots) {
          const placeId = placeByRmsId.get(String(snapshot.placeRmsId).trim());
          if (!placeId) {
            sails.log.warn(
              `RMS adapter syncOutOfStocks: no enabled cooking point with rmsId "${snapshot.placeRmsId}", snapshot skipped`,
            );
            continue;
          }
          byPlace.set(placeId, [...(byPlace.get(placeId) ?? []), ...(snapshot.items ?? [])]);
        }
        return byPlace;
      }

      sails.log.warn(
        `RMS adapter declares supportsPlaceBalances but returned no per-place snapshot, ` +
        `falling back to the global stop list`,
      );
    }

    const items = await this.loadOutOfStocksDishes();
    for (const placeId of await getEnabledCookingPlaceIds()) {
      byPlace.set(placeId, items);
    }
    return byPlace;
  }

  /**
   * Synchronizing the RMS stock of products with the RMS adapter.
   *
   * The RMS sends a full snapshot rather than a diff: everything outside it is
   * available. `DishPlace.rmsBalance` is always written — the operator's balance
   * column next to it is physically out of reach, which is the whole point of
   * splitting them.
   *
   * `enable` is written only when the snapshot carries it. Switching a product
   * on and off at a point is the operator's call, and an RMS that says nothing
   * must not undo it; an RMS that says `false` is making a statement and is
   * obeyed. Nothing is defaulted to `true` on the way through.
   */
  public async syncOutOfStocks(): Promise<void> {
    sails.log.silly("ADAPTER RMS > syncOutOfStocks")
    if (this.syncOutOfStocksPromise && this.syncOutOfStocksPromise.status === "pending") {
      sails.log.warn(`Method "syncOutOfStocks" was already executed and won't be executed again`);
      return this.syncOutOfStocksPromise.promise;
    }

    const promise = new Promise<void>((resolve) => {
      (async () => {
        try {
          const itemsByPlace = await this.loadOutOfStocksByPlace();
          const coveredPlaceIds = [...itemsByPlace.keys()];

          if (!coveredPlaceIds.length) {
            sails.log.warn("RMS adapter syncOutOfStocks: no cooking point to apply the stop list to");
          }

          for (const [placeId, items] of itemsByPlace) {
            const products = items.length
              ? await Dish.find({ where: { rmsId: items.map((item) => item.rmsId) } })
              : [];
            const productIdByRmsId = new Map<string, string>(
              products.map((product: DishRecord) => [String(product.rmsId), String(product.id)]),
            );

            await this.resetOutOfStocksAtPlace(placeId, new Set(productIdByRmsId.values()));

            for (const item of items) {
              const productId = productIdByRmsId.get(String(item.rmsId));
              if (!productId) continue;

              const event: RMSOutOfStockEventItem = { ...item, placeId };
              emitter.emit("rms-sync:out-of-stocks-before-each-product-item", event);
              // `enable` is passed only when the snapshot stated it: `upsertForPlace`
              // keeps the stored value for any key it is not given, so an absent
              // field leaves the operator's switch alone.
              await DishPlace.upsertForPlace(productId, placeId, {
                rmsBalance: item.balance,
                ...(item.enable !== undefined && { enable: item.enable }),
              });
            }
          }

          await this.writeLastSuccessfulSyncDate("RMS_LAST_SUCCESSFUL_STOPLISTS_SYNC_AT");
          emitter.emit("rms-sync:after-sync-out-of-stocks");
          resolve();
        } catch (error) {
          // Same as syncProducts: an unhandled rejection here crashes the
          // process; log and let the next interval tick retry.
          sails.log.error(`RMS adapter syncOutOfStocks error:`, error);
          resolve();
        }
      })();
    });

    this.syncOutOfStocksPromise = new ObservablePromise(promise)
    return promise;
  }

  /**
   * Drops the RMS limit of every product of one point that left the stop list.
   *
   * Existing rows only: a product that never had one is already unlimited, and
   * creating rows here would grow a row per product on every tick. The rows to
   * touch are picked in JS on purpose — `{'!=': -1}` skips NULL rows on Postgres
   * but matches them on sails-disk, so the same query would mean two things.
   */
  private async resetOutOfStocksAtPlace(placeId: string, keepProductIds: Set<string>): Promise<void> {
    const rows = await DishPlace.find({ where: { place: placeId } });

    const resetIds: string[] = [];
    const emptyIds: string[] = [];
    for (const row of rows) {
      if (keepProductIds.has(String(row.dish))) continue;

      // Once the RMS limit is dropped this row would say nothing at all.
      const localLimits = typeof row.localBalance === "number" && row.localBalance !== UNLIMITED_BALANCE;
      if (!localLimits && row.enable !== false) {
        emptyIds.push(row.id);
        continue;
      }

      const rmsLimits = typeof row.rmsBalance === "number" && row.rmsBalance !== UNLIMITED_BALANCE;
      if (rmsLimits) resetIds.push(row.id);
    }

    if (resetIds.length) await DishPlace.update({ id: { in: resetIds } }, { rmsBalance: UNLIMITED_BALANCE }).fetch();
    if (emptyIds.length) await DishPlace.destroy({ id: { in: emptyIds } }).fetch();
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

  /** The whole stop list as one snapshot. Everything outside it is available. */
  protected abstract loadOutOfStocksDishes(concept?: string): Promise<RMSOutOfStockItem[]>;

  /**
   * The stop list split by RMS terminal, for adapters that can report it.
   *
   * Deliberately not abstract: making it abstract would break every existing
   * adapter's build. Returning `null` — the default — means "this RMS has no
   * terminals", and the base class falls back to the global snapshot.
   */
  protected async loadOutOfStocksDishesByPlace(concept?: string): Promise<RMSPlaceOutOfStockSnapshot[] | null> {
    return null;
  }

  /**
   * Which RMS terminal serves this address, for the `rms` kitchen strategy.
   *
   * Public rather than protected: core asks the question, the adapter answers
   * it. Deliberately not abstract, and `null` — the default — means "this RMS
   * does not route orders to terminals", which is the honest answer for every
   * adapter that exists today. The returned value is a `Place.rmsId`, not a
   * `Place.id`: an RMS knows its own terminals and nothing about our rows.
   */
  public async resolveCookingPlaceRmsId(context: {
    coordinate: { lat: number; lng: number } | null;
  }): Promise<string | null> {
    return null;
  }

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
