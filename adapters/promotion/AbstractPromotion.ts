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
  public abstract configDiscount?: IconfigDiscount;

  public abstract concept: string[];

  // id for outside system
  public abstract externalId?: string;


  // TODO: makes it not optional
  public abstract condition?(arg1: Group | Dish | Order): boolean

  public abstract action?(order: Order): Promise<PromotionState>;
  
  public abstract displayGroup?(group: Group, user?: string | User): Promise<Group[]>;

  public abstract displayDish?(dish: Dish, user?:string | User): Promise<Dish[]>;
}
