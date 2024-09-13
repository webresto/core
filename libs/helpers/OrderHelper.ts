// todo: fix types model instance to {%ModelName%}Record for Order";
import hashCode from "../hashCode";
import { extractFieldValues } from "../stringsInArray";

export type InitCheckout = {
  /** Order nonce */
  nonce: number
  /**
   * Intervals during which an order can be placed
   * */
  worktimeIntervals: [number, number][]
  
  /**
   * Will it be possible to order as quickly as possible?
   */
  allowSoonAsPossible: boolean

  /**
   * Allow order by time
   */
  allowOrderToTime: boolean
}
export class OrderHelper {
  private constructor(orderId: string) {

  }

  public static async initCheckout(populatedOrder: Order): Promise<InitCheckout> {
    let initCheckout: InitCheckout = {
      worktimeIntervals: [],
      allowSoonAsPossible: true,
      allowOrderToTime: true,
      nonce: 0
    }
    await emitter.emit('core:order-init-checkout', populatedOrder, initCheckout);
    initCheckout.nonce = populatedOrder.nonce
    return initCheckout;
  }

  public static orderHash(populatedOrder: Order): string {
    const fieldsToExclude = [
      'createdAt',
      'updatedAt',
      'shortId',
      'isPromoting',
      'nonce',
      'hash'
    ]

    let summarizeOrder = extractFieldValues(populatedOrder,fieldsToExclude).join("")
    
    let hash: string = hashCode(summarizeOrder);

    return hash
  }
}