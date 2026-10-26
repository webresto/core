// todo: fix types model instance to {%ModelName%}Record for Order";
import { OrderRecord } from "../../models/Order";
import hashCode from "../hashCode";
import { extractFieldValues } from "../stringsInArray";
import { orderIntervals } from "./kitchen-assignment";

export type InitCheckout = {
  /** Order nonce */
  nonce: number
  /**
   * When the order can be had: `[from, to]` in Unix seconds, from now to the latest moment it may be for, by the hours
   * of its kitchens (a delivery) or of its point (pickup, dine-in). Empty - never (no address or point yet, closed for
   * the whole limit).
   * */
  worktimeIntervals: [number, number][]

  /** Whether the order can be had as soon as possible: an interval holds now. */
  allowSoonAsPossible: boolean

  /** Whether the order can be had by a time: there is an interval. */
  allowOrderToTime: boolean

  /**
   * Above the expenditure of bonuses on a check of a piece that will be shown to the user
   */
  bonusBannerHTMLChunk: string | null

  /**
   *  the minimum time required to cook the dish. This value is added to the minimum delivery time to calculate the earliest possible time the order can be ready.
   */
  minCookingTimeInMinutes: number

  /**
   * Optional textual description of cooking time (e.g. "Prepared in 15–20 minutes").
   * Useful for displaying estimated preparation time to customers.
   */
  cookingTimeDescription?: string | null;
}
export class OrderHelper {
  private constructor(orderId: string) {

  }

  /**
   * What the checkout of an order may offer. The time - by the hours of the kitchens only: `worktimeIntervals` are
   * the moments the order can be had (`orderIntervals`), "as soon as possible" - one of them is now.
   */
  public static async initCheckout(populatedOrder: OrderRecord): Promise<InitCheckout> {
    const now = new Date();
    const intervals = await orderIntervals(populatedOrder, now);
    let initCheckout: InitCheckout = {
      worktimeIntervals: intervals,
      allowSoonAsPossible: intervals.length > 0 && intervals[0][0] <= Math.floor(now.getTime() / 1000),
      allowOrderToTime: intervals.length > 0,
      nonce: 0,
      bonusBannerHTMLChunk: null,
      minCookingTimeInMinutes: 0,
      cookingTimeDescription: null
    }
    await emitter.emit('core:order-init-checkout', populatedOrder, initCheckout);
    initCheckout.nonce = populatedOrder.nonce as number
    initCheckout.bonusBannerHTMLChunk = await Settings.get("BONUS_BANNER_HTML_CHUNK") as string
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