// todo: fix types model instance to {%ModelName%}Record for Order";
import { OrderRecord } from "../../models/Order";
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

  /**
   * Above the expenditure of bonuses on a check of a piece that will be shown to the user
   */
  bonusBannerHTMLChunk: string
}
export class OrderHelper {
  private constructor(orderId: string) {

  }

  public static async initCheckout(populatedOrder: OrderRecord): Promise<InitCheckout> {
    let initCheckout: InitCheckout = {
      worktimeIntervals: [],
      allowSoonAsPossible: true,
      allowOrderToTime: true,
      nonce: 0,
      bonusBannerHTMLChunk: null
    }
    await emitter.emit('core:order-init-checkout', populatedOrder, initCheckout);
    initCheckout.nonce = populatedOrder.nonce
    initCheckout.bonusBannerHTMLChunk = await Settings.get("BONUS_BANNER_HTML_CHUNK")
    return initCheckout;
  }

  public static orderHash(populatedOrder: OrderRecord): string {
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