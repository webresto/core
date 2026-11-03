import { OrderRecord } from "../../models/Order";
import {
  getAllowedOrderTransitionsByRole,
  isCompletedOrderState,
  isOperatorUser,
  isValidOrderState,
} from "./OrderStateFlow";

/**
 * Moving an order along the flow by a member of staff — the board of the admin panel and the mobile
 * application by one function (plan C5).
 *
 * Both used to hold their own copy of the same four steps: what the role may choose, `doFinalize`
 * for DONE and REJECT, `next` for the rest, and a journal entry. Two copies of a state machine
 * drift, and the one that drifts is always the one with fewer readers.
 *
 * The role only narrows the choice of target states: the move itself is the same for everyone. DONE
 * and REJECT go through `Order.doFinalize` — it saves the delivered address, matches a guest order
 * to an account and emits `core:order-after-done`; a bare state change would skip all of it.
 *
 * Nothing here decides *who* may touch *this* order: the caller has already checked its point
 * (`ordersOfPlace`, `order-kanban` with the point as context). This is the flow, not the rights.
 */

export interface OrderTransitionRequest {
  /** The member of staff asking; their groups decide which target states they may choose. */
  user: unknown;
  /** Who is asking: `order-kanban` for the board, `mobile-api` for the phone. Goes to the journal. */
  source: string;
  /** Anything else the journal should carry — the device of a phone, for one. */
  data?: Record<string, unknown>;
}

export type OrderTransitionResult =
  | { ok: true; moved: boolean; order: OrderRecord; from: string; allowedTransitions: string[] }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid_state" }
  | { ok: false; reason: "forbidden"; from: string; allowedTransitions: string[] }
  | { ok: false; reason: "failed"; message: string; from: string; allowedTransitions: string[] };

/** The journal message of a move; read back by everything that resolves when an order was closed. */
export function stateChangedMessage(source: string): string {
  return `${source}: state changed`;
}

export async function transitionOrder(
  criteria: string | { id: string },
  to: string,
  { user, source, data = {} }: OrderTransitionRequest,
): Promise<OrderTransitionResult> {
  const query = typeof criteria === "string" ? { id: criteria } : criteria;
  if (!isValidOrderState(to)) return { ok: false, reason: "invalid_state" };

  const order: OrderRecord | undefined = await Order.findOne!(query);
  if (!order) return { ok: false, reason: "not_found" };

  const operatorLimited = isOperatorUser(user);
  const from = order.state || "NEW";
  const allowedTransitions = getAllowedOrderTransitionsByRole(from, operatorLimited);

  // Asking for the state it is already in is an answer, not a move: the board sends it when two
  // operators press the same button.
  if (from === to) return { ok: true, moved: false, order, from, allowedTransitions };
  if (!allowedTransitions.includes(to)) return { ok: false, reason: "forbidden", from, allowedTransitions };

  try {
    if (isCompletedOrderState(to)) await Order.doFinalize!({ id: order.id }, to as "DONE" | "REJECT");
    else await Order.next!({ id: order.id }, to);
  } catch (error: any) {
    return { ok: false, reason: "failed", message: error?.message || String(error), from, allowedTransitions };
  }

  const moved: OrderRecord | undefined = await Order.findOne!({ id: order.id });
  if (!moved) return { ok: false, reason: "not_found" };

  await Order.log!({ id: order.id }, "info", source, stateChangedMessage(source), {
    from,
    to,
    byUserId: (user as any)?.id ?? null,
    operatorLimited,
    ...data,
  });

  return {
    ok: true,
    moved: true,
    order: moved,
    from,
    allowedTransitions: getAllowedOrderTransitionsByRole(moved.state || to, operatorLimited),
  };
}
