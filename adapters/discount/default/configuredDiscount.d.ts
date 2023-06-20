import { WorkTime } from "@webresto/worktime";
import Order from "../../../models/Order";
import AbstractDiscountHandler from "../AbstractDiscount";
import Discount from './../../../models/Discount';
export default class configuredDiscount extends AbstractDiscountHandler {
    constructor(discount: Discount);
    id: string;
    isJoint: boolean;
    name: string;
    isPublic: boolean;
    description: string;
    concept: string[];
    configDiscount: {};
    discount: string;
    discountType: string;
    actions: string;
    enable: boolean;
    isDeleted: boolean;
    sortOrder: number;
    productCategoryDiscounts: any;
    hash: string;
    worktime: WorkTime[];
    condition(order: Order): Promise<boolean>;
    action(): Promise<void>;
    displayGroupDiscount(): Promise<void>;
    displayGroupDish(): Promise<void>;
}