import { WorkTime } from "@webresto/worktime";
import Order from "../../../models/Order";
import AbstractDiscountHandler from "../AbstractDiscount";
import Discount from './../../../models/Discount';

export default class configuredDiscount extends AbstractDiscountHandler {
    constructor(discount:Discount) {
        super();
        this.id = discount.id,
        this.isJoint = discount.isJoint,
        this.name= discount.name,
        this.isPublic= discount.isPublic;
        this.description= discount.description;
        this.concept= discount.concept;
        this.configDiscount= discount.configDiscount;
        this.discount= discount.discount;
        this.discountType= discount.discountType;
        this.actions= discount.actions;
        this.enable= discount.enable;
        this.isDeleted= discount.isDeleted;
        this.sortOrder= discount.sortOrder;
        this.productCategoryDiscounts= discount.productCategoryDiscounts;
        this.hash= discount.hash;
        this.worktime= discount.worktime;
        // this.condition = discount.condition;
        // this.action = discount.action;
        // this.displayGroupDiscount = discount.displayGroupDiscount;
        // this.displayGroupDish = discount.displayGroupDish;
    }

    public id: string;
    public isJoint: boolean;
    public name: string;
    public isPublic: boolean;
    public description: string;
    public concept: string[];
    public configDiscount: {};
    public discount: string;
    public discountType: string;
    public actions: string;

    public enable: boolean;
    public isDeleted: boolean;
    public sortOrder: number;
    public productCategoryDiscounts: any;
    public hash: string;
    public worktime: WorkTime[];

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