export const ORDER_STATE_TRANSITIONS: Record<string, string[]> = {
  NEW: ["CART"],
  CART: ["CHECKOUT", "REJECT"],
  CHECKOUT: ["CART", "PAYMENT", "ORDER", "REJECT"],
  PAYMENT: ["CART", "ORDER", "CHECKOUT", "REJECT"],
  ORDER: ["COOKING", "ON_THE_WAY", "DONE", "REJECT"],
  COOKING: ["ON_THE_WAY", "DONE", "REJECT"],
  ON_THE_WAY: ["DONE", "REJECT"],
  DONE: [],
  REJECT: [],
};

export const ORDER_OPERATOR_ALLOWED_TARGET_STATES = ["REJECT", "COOKING", "ON_THE_WAY", "DONE"];
export const ORDER_COMPLETED_STATES = ["DONE", "REJECT"];
export const ORDER_PRE_ORDER_FILTERED_STATES = ["NEW", "CART", "CHECKOUT", "PAYMENT"];
export const ORDER_KITCHEN_PROGRESS_STATES = ["ORDER", "COOKING", "ON_THE_WAY"];
export const ORDER_KANBAN_DEFAULT_COMPLETED_WINDOW_HOURS = 24;
export const ORDER_KANBAN_DEFAULT_NEW_WINDOW_MINUTES = 15;

const ORDER_STATE_SET = new Set(Object.keys(ORDER_STATE_TRANSITIONS));
const OPERATOR_ALLOWED_TARGET_STATE_SET = new Set(ORDER_OPERATOR_ALLOWED_TARGET_STATES);
const ORDER_COMPLETED_STATE_SET = new Set(ORDER_COMPLETED_STATES);
const ORDER_PRE_ORDER_FILTERED_STATE_SET = new Set(ORDER_PRE_ORDER_FILTERED_STATES);
const ORDER_KITCHEN_PROGRESS_STATE_SET = new Set(ORDER_KITCHEN_PROGRESS_STATES);

function getUserGroupNames(user: any): string[] {
  if (!Array.isArray(user?.groups)) return [];
  return user.groups
    .map((group: any) => String(group?.name || "").trim().toLowerCase())
    .filter((name: string) => name.length > 0);
}

export function isOperatorUser(user: any): boolean {
  if (user?.isAdministrator) return false;
  const names = getUserGroupNames(user);
  return names.some((name) => (
    name === "operator" ||
    name.includes("operator") ||
    name.includes("оператор")
  ));
}

export function isValidOrderState(state: unknown): boolean {
  const normalized = String(state || "");
  return ORDER_STATE_SET.has(normalized);
}

export function isCompletedOrderState(state: unknown): boolean {
  const normalized = String(state || "");
  return ORDER_COMPLETED_STATE_SET.has(normalized);
}

export function isPreOrderFilteredState(state: unknown): boolean {
  const normalized = String(state || "");
  return ORDER_PRE_ORDER_FILTERED_STATE_SET.has(normalized);
}

export function isKitchenProgressOrderState(state: unknown): boolean {
  const normalized = String(state || "");
  return ORDER_KITCHEN_PROGRESS_STATE_SET.has(normalized);
}

export function getAllowedOrderTransitions(state: string): string[] {
  const normalizedState = String(state || "");
  return ORDER_STATE_TRANSITIONS[normalizedState] || [];
}

export function getAllowedOrderTransitionsByRole(state: string, operatorLimited: boolean): string[] {
  const allowedTransitions = getAllowedOrderTransitions(state);
  if (!operatorLimited) {
    return allowedTransitions;
  }
  return allowedTransitions.filter((targetState) => OPERATOR_ALLOWED_TARGET_STATE_SET.has(targetState));
}
