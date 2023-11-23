import { IconfigDiscount } from "../../interfaces/ConfigDiscount";
import Order, { PromotionState } from "../../models/Order";
// import { WorkTime } from "@webresto/worktime";
import User from "../../models/User";
import Group from "../../models/Group";
import Dish from "../../models/Dish";

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

  // id for outside system
  public abstract externalId?: string;

  /**
   * For delete by badge
   */
  public abstract badge: string;

  // TODO: makes it not optional
  public abstract condition(arg1: Group | Dish | Order): boolean

  /**
   * The order must be modified and recorded in model within this method
   * @param order: Order should populated order
   */
  public abstract action(order: Order): Promise<PromotionState>;
  
  /**
   * If isPublic === true displayGroup is required
   */
  public abstract displayGroup?(group: Group, user?: string | User): Group;

  /**
   * If isPublic === true displayDish is required
   */
  public abstract displayDish?(dish: Dish, user?:string | User): Dish;
}
