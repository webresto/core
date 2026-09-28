import { AbstractPromotionHandler } from "../../adapters/promotion/PromotionAdapter";
export default function discountGenerator(config?: Omit<AbstractPromotionHandler, "action" | "condition">): AbstractPromotionHandler;
