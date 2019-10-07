import OrderResponse from "@webresto/core/adapter/rms/OrderResponse";
import OrderData from "@webresto/core/adapter/rms/OrderData";
import Cart from "@webresto/core/models/Cart";

export default abstract class RMSAdapter {
  protected readonly syncMenuTime: number;
  protected readonly syncBalanceTime: number;
  protected readonly syncStreetsTime: number;

  protected constructor(menuTime: number, balanceTime: number, streetsTime: number) {
    this.syncMenuTime = menuTime;
    this.syncBalanceTime = balanceTime;
    this.syncStreetsTime = streetsTime;
  }

  protected abstract async sync(): Promise<void>;

  protected abstract async syncStreets(): Promise<void>;

  protected abstract async syncBalance(): Promise<void>;

  public abstract async createOrder(orderData: Cart, selfService: boolean): Promise<OrderResponse>;

  public abstract async checkOrder(orderData: Cart, selfService: boolean): Promise<OrderResponse>;

  public abstract async getSystemData(): Promise<any>;

  public abstract async api(method: string, params: any): Promise<any>;

  static getInstance(...params): RMSAdapter {
    return RMSAdapter.prototype
  };
}
