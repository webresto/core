import AbstractPromotionHandler from "../../adapters/promotion/AbstractPromotion";
export default function discountGenerator(config?: Omit<AbstractPromotionHandler, "action" | "condition">): AbstractPromotionHandler;
