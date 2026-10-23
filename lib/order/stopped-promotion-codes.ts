import type { OrderRecord } from "../../models/Order";
import type { PromotionCodeRecord } from "../../models/PromotionCode";
import { promotionCodeWorks } from "../promotion-code";

const SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * A code stops working while it sits in carts - switched off, deleted, past its dates, out of its hours - and nothing
 * recounts them until the visitor changes something. The carts (CART, CHECKOUT) with such a code are recounted: the
 * recount takes the code off (`Order.countCart`) and the order goes to the storefront by the subscription `order`. A
 * checked cart goes back to CART - its total changed, it is checked again. PAYMENT is left: its payment is asked for
 * its sum already. Returns how many carts lost their code.
 */
export async function takeOffStoppedPromotionCodes(): Promise<number> {
  const carts: OrderRecord[] = await Order.find!({ state: ["CART", "CHECKOUT"], promotionCode: { "!=": null } } as any);
  if (!carts.length) return 0;
  const ids = [...new Set(carts.map((cart) => cart.promotionCode as string))];
  const codes: PromotionCodeRecord[] = await PromotionCode.find!({ id: ids });
  const working = new Set(codes.filter((code) => promotionCodeWorks(code)).map((code) => code.id));
  let taken = 0;
  for (const cart of carts) {
    if (working.has(cart.promotionCode as string)) continue;
    const id = cart.id as string;
    try {
      if (cart.state === "CHECKOUT") await Order.next(id, "CART");
      await Order.countCart({ id });
      taken++;
    } catch (error) {
      sails.log.error(`Core > promotion codes: cart [${id}] is not recounted`, error);
    }
  }
  return taken;
}

/** the sweep once a minute, from the start of the core */
export function startPromotionCodeSweep(): void {
  setInterval(() => {
    takeOffStoppedPromotionCodes().catch((error) => sails.log.error("Core > promotion codes: the sweep failed", error));
  }, SWEEP_INTERVAL_MS).unref?.();
}
