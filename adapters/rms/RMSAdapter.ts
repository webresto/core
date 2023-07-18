import Order from "../../models/Order";
import Dish from "../../models/Dish";
import Group from "../../models/Group";
export type ConfigRMSAdapter = {
  [key: string]: number | boolean | string;
};

/**
 * Responce from RMS
 */
interface OrderResponse {
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
    const NO_SYNC_NOMENCLATURE = await Settings.get("NO_SYNC_NOMENCLATURE") as boolean;
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
    const NO_SYNC_OUT_OF_STOCKS = await Settings.get("NO_SYNC_OUT_OF_STOCKS") as boolean;
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
   */
  public static async syncProducts(force: boolean = false): Promise<void> {
    const rootGroupsToSync = await Settings.get("rootGroupsRMSToSync") as string[];
    const rmsAdapter = await Adapter.getRMSAdapter();

    if(rmsAdapter.nomenclatureHasUpdated() || force) {
       const currentRMSGroupsFlatTree = await rmsAdapter.loadNomenclatureTree(rootGroupsToSync);
       // TODO: clean deleted dish and groups 
       // CheckSum
       // TODO: UPDATE GROUP LOGIC
       // TODO: udate images
       const currentRMSGroupsIds = currentRMSGroupsFlatTree.map(prd => prd.rmsId);
       for (const group of currentRMSGroupsFlatTree){
        emitter.emit("rms-sync:before-each-group-item", group);

        const productsToUpdate = await rmsAdapter.loadProductsByGroup(group.rmsId)
          for(let product of productsToUpdate){
            // CheckSum
            emitter.emit("rms-sync:before-each-product-item", product);
            // TODO: UPDATE PRODUCT LOGIC
            // TODO: udate images
          }
       }
    }
    
    return
  };

  /**
   * Synchronizing the balance of dishes with the RMS adapter
   */
  public static syncOutOfStocks(): Promise<void> {
    
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
  protected abstract loadNomenclatureTree(groupIds?: string[]): Promise<Group[]> 



  protected abstract loadProductsByGroup(groupId: string): Promise<Dish[]> 






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
