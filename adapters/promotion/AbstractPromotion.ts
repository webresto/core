import { IconfigDiscount } from "../../interfaces/ConfigDiscount";
import { DishRecord } from "../../models/Dish";
import { GroupRecord } from "../../models/Group";
import { OrderRecord, PromotionState } from "../../models/Order";
import { UserRecord } from "../../models/User";
// todo: fix types model instance to {%ModelName%}Record for Order";
// import { WorkTime } from "@webresto/worktime";
// todo: fix types model instance to {%ModelName%}Record for User";
// todo: fix types model instance to {%ModelName%}Record for Group";
// todo: fix types model instance to {%ModelName%}Record for Dish";

export default abstract class AbstractPromotionHandler {
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

  // TODO: makes it not optional
  public abstract condition(arg1: GroupRecord | DishRecord | OrderRecord): boolean

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
