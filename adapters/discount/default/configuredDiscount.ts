import Order from "../../../models/Order";
import AbstractDiscountHandler from "../AbstractDiscount";
import Discount from './../../../models/Discount';

export default class configuredDiscount extends AbstractDiscountHandler {
    constructor(discount:Discount) {
    super();
       this.id = discount.id;
       this.isJoint = discount.isJoint,
       
    }

    public id: string;
    public isJoint: boolean;
    public name: string;
    public isPublic: boolean;
    public description: string;
    public concept: string[];
    public configuredDiscount: {};
    public discount: string;
    public discountType: string;
    public actions: string;
    public condition(order: Order): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    public action(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public displayGroupDiscount(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public displayGroupDish(): Promise<void> {
        throw new Error("Method not implemented.");
    }
   
}