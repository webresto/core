import Order from "../../models/Order";
import Dish from "../../models/Dish";
import Group from "../../models/Group";
export type ConfigRMSAdapter = {
  [key: string]: number | boolean | string;
};

/**
 * Responce from RMS
 */
export interface OrderResponse {
  code: number;
  body: any;
}


/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */


export default abstract class RMSAdapter {
  public readonly config: ConfigRMSAdapter = {};
  
  private static syncProductsInterval: ReturnType<typeof setInterval>;
  private static syncOutOfStocksInterval: ReturnType<typeof setInterval>;

  public constructor(config?: ConfigRMSAdapter) {
    this.config = config;

    // Run async inittilization
    RMSAdapter.initialize();
  }

  private static async initialize(){
    // Run product sync interval
    const NO_SYNC_NOMENCLATURE = await Settings.get("NO_SYNC_NOMENCLATURE") as boolean ?? false;
    if(!NO_SYNC_NOMENCLATURE) {
      const SYNC_PRODUCTS_INTERVAL_SECOUNDS = await Settings.get("SYNC_PRODUCTS_INTERVAL_SECOUNDS") as number;
      if(RMSAdapter.syncProductsInterval) clearInterval(RMSAdapter.syncProductsInterval);
      RMSAdapter.syncProductsInterval = setInterval(
        async () => {
          RMSAdapter.syncProducts();
        },
        SYNC_PRODUCTS_INTERVAL_SECOUNDS < 120 ? 120000 : SYNC_PRODUCTS_INTERVAL_SECOUNDS * 1000 || 120000
      );
    }

    // Run sync OutOfStock
    const NO_SYNC_OUT_OF_STOCKS = await Settings.get("NO_SYNC_OUT_OF_STOCKS") as boolean ?? false;
    if(!NO_SYNC_OUT_OF_STOCKS) {
      const SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS = await Settings.get("SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS") as number;
      if(RMSAdapter.syncOutOfStocksInterval) clearInterval(RMSAdapter.syncOutOfStocksInterval);
      RMSAdapter.syncOutOfStocksInterval = setInterval(
        async () => {
          RMSAdapter.syncOutOfStocks();
        },
        SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS < 60 ? 60000 : SYNC_OUT_OF_STOCKS_INTERVAL_SECOUNDS * 1000 || 60000
      );
    }
  }


  /**
   * Menu synchronization with RMS system
   * At first, groups are synchronized, then dishes are synchronized for each of these groups.
   * When synchronizing groups, those groups that were not on the list will be turned off before the start of synchronization
   * Those dishes that are left without ties will be marked with isDeleted
   * There can be no dishes in the root.
   */
  public static async syncProducts(concept?: string, force: boolean = false): Promise<void> {
    
    // TODO: implement concept 


    const rootGroupsToSync = await Settings.get("rootGroupsRMSToSync") as string[];
    const rmsAdapter = await Adapter.getRMSAdapter();
  
    if (rmsAdapter.nomenclatureHasUpdated() || force) {
      const currentRMSGroupsFlatTree = await rmsAdapter.loadNomenclatureTree(rootGroupsToSync);
  
      // Get ids of all current RMS groups
      const rmsGroupIds = currentRMSGroupsFlatTree.map(group => group.rmsId);
  
      // Set all groups not in the list to inactive
      await Group.update({ where:{ rmsId: { not: rmsGroupIds }}},{ isDeleted: true }).fetch();
  
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
      await Dish.update({ where:{ or: [ { parentGroup: { in: inactiveGroupIds }}, { rmsId: { not: allProductIds }}, {parentGroup: null} ]}}, { isDeleted: true });
    }
  
    return
  };

  /**
   * Synchronizing the balance of dishes with the RMS adapter
   */
  public static syncOutOfStocks(): Promise<void> {
    // Consider the concepts
    return
  };

  /**
   * Checks whether the nomenclature was updated if the last time something has changed will return to True
   * @returns boolean
   */
  protected abstract nomenclatureHasUpdated(): Promise<boolean> 

  /**
   * 
   * @returns 
   */
  protected abstract loadNomenclatureTree(rmsGroupIds?: string[]): Promise<Group[]> 



  protected abstract loadProductsByGroup(group: Group): Promise<Dish[]> 

  protected abstract loadOutOfStocksDishes(concept?:  string): Promise<Dish[]> 





  /**
   * Create an order
   * @param orderData - webresto order
   * @return Order response
   */
  public abstract createOrder(orderData: Order): Promise<OrderResponse>;

  /**
   * Order check before order
   * @param orderData - webresto order
   * @return Order response
   */
  public abstract checkOrder(orderData: Order): Promise<OrderResponse>;

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
