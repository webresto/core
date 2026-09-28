// todo: fix types model instance to {%ModelName%}Record for Order"
import { IconfigDiscount } from "../../interfaces/ConfigDiscount";
import { DishRecord } from "../../models/Dish";
import { GroupRecord } from "../../models/Group";
import { OrderRecord, PromotionState } from "../../models/Order";
import { OrderDishRecord } from "../../models/OrderDish";
import { UserRecord } from "../../models/User";

export abstract class AbstractPromotionHandler {
  /** unique id */
  public abstract id: string;

  // setORMId(id: string): void {
  //   this.id = id;
  // }

  public abstract isJoint: boolean;

  public abstract name: string;

  public abstract isPublic: boolean;

  // public abstract createdByUser: boolean;

  public abstract description?: string;

  // TODO: remove
  public configDiscount?: IconfigDiscount = null;

  public abstract concept: string[];

  // id for an outside system
  public abstract externalId?: string;

  /**
   * For delete by badge
   */
  public abstract badge: string;

  /**
   * Decides whether this promotion applies to the target.
   *
   * @param arg1 the order/dish/group being evaluated
   * @param viaPromocode true when the promotion is being activated by an applied
   *   PromotionCode. In this mode the handler should NOT require its automatic
   *   targeting (dish/group match) — the code is an explicit activation — but it
   *   may still enforce code-eligibility rules (e.g. a minimum basket total).
   *   Handlers that don't care can ignore this argument (defaults to false).
   */
  // TODO: makes it not optional
  public abstract condition(arg1: GroupRecord | DishRecord | OrderRecord, viaPromocode?: boolean): boolean

  /**
   * The order must be modified and recorded in a model within this method
   * @param order Order should populated order
   */
  public abstract action(order: OrderRecord): Promise<PromotionState>;

  /**
   * If isPublic === true displayGroup is required
   */
  public abstract displayGroup?(group: GroupRecord, user?: string | UserRecord): GroupRecord;

  /**
   * If isPublic === true displayDish is required
   */
  public abstract displayDish?(dish: DishRecord, user?:string | UserRecord): DishRecord;
}

// todo: fix types model instance to {%ModelName%}Record for Group';
// todo: fix types model instance to {%ModelName%}Record for Dish';
// todo: fix types model instance to {%ModelName%}Record for OrderDish";
export default abstract class AbstractPromotionAdapter {
    public abstract promotions: { [key: string]: AbstractPromotionHandler };

    /**
     * The order must be recorded in a model and modified during execution
     * @param order Order should populated order
     */
    public abstract processOrder(order: OrderRecord): Promise<OrderRecord>

    public abstract displayDish(dish: DishRecord): DishRecord;
    public abstract displayGroup(group: GroupRecord): GroupRecord;
    public abstract getActivePromotionsIds(): string[];

    /**
     * Base realization clearOfPromotion
     * the order attribute will be changed during method execution
     *
     * This is in an abstract class because it's essentially part of the core, but you can rewrite it
     */
    public async clearOfPromotion(order: OrderRecord): Promise<OrderRecord> {
        // if Order.status ="PAYMENT" or "ORDER" can't clear promotions
        if (Order.isOrderedState(order.state)) throw `order with orderId ${order.id} in state ${order.state}`;
        //if (order.state === "PAYMENT") throw "order with orderId" + order.id + "in state PAYMENT";

        // const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");

        await OrderDish.destroy({ order: order.id, addedBy: "promotion" }).fetch();
        await OrderDish.update({ order: order.id }, { discountTotal: 0, discountType: null, discountAmount: 0, discountMessage: null, discountId: null, discountDebugInfo: null  }).fetch();
        await Order.updateOne({ id: order.id }, { discountTotal: 0, promotionFlatDiscount: 0 });

        let dishes = order.dishes ? order.dishes as OrderDishRecord[] : []
        dishes.forEach((orderItem) => {
            orderItem.discountTotal = 0,
            orderItem.discountType = null,
            orderItem.discountAmount = 0,
            orderItem.discountMessage = null
            orderItem.discountId = null
            orderItem.discountDebugInfo = null
        })

        order.promotionState = [];
        order.promotionDelivery = null;
        order.promotionUnorderable = false;
        order.dishes = dishes;
        order.discountTotal = 0;
        order.promotionFlatDiscount = 0;
        order.promotionDelivery = null;
        return order
    }

    public abstract deletePromotion(id: string): void

    public abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;

    public abstract getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
}
