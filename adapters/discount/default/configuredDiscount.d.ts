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
    configuredDiscount: {};
    discount: string;
    discountType: string;
    actions: string;
    condition(order: Order): Promise<boolean>;
    action(): Promise<void>;
    displayGroupDiscount(): Promise<void>;
    displayGroupDish(): Promise<void>;
}
