import AbstractDiscount from "../AbstractDiscount";
import Order from "../../../models/Order";

export class SimpleDiscount {//extends AbstractDiscount{
  
    public id: string

    public readonly discount: string;

    public readonly action: string;

    public readonly discountType: string;

    public Condition(order: Order): Promise<boolean> {
    // for (let key in this.discounts) {
    //   if (this.discounts.hasOwnProperty(key)) {
    //     if (this.discounts[key].discountType === threshold.action) {
    //       return Promise.resolve(true);
    //     }
    //   }
    // }
        throw new Error("Method not implemented.");
    }

    public Action(): Promise<void> {
        console.log("action: " + this.action)
        return
    }

}
