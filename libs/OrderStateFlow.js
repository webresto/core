"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDER_KANBAN_DEFAULT_NEW_WINDOW_MINUTES = exports.ORDER_KANBAN_DEFAULT_COMPLETED_WINDOW_HOURS = exports.ORDER_KITCHEN_PROGRESS_STATES = exports.ORDER_PRE_ORDER_FILTERED_STATES = exports.ORDER_COMPLETED_STATES = exports.ORDER_OPERATOR_ALLOWED_TARGET_STATES = exports.ORDER_STATE_TRANSITIONS = void 0;
exports.isOperatorUser = isOperatorUser;
exports.isValidOrderState = isValidOrderState;
exports.isCompletedOrderState = isCompletedOrderState;
exports.isPreOrderFilteredState = isPreOrderFilteredState;
exports.isKitchenProgressOrderState = isKitchenProgressOrderState;
exports.getAllowedOrderTransitions = getAllowedOrderTransitions;
exports.getAllowedOrderTransitionsByRole = getAllowedOrderTransitionsByRole;
exports.ORDER_STATE_TRANSITIONS = {
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
exports.ORDER_OPERATOR_ALLOWED_TARGET_STATES = ["REJECT", "COOKING", "ON_THE_WAY", "DONE"];
exports.ORDER_COMPLETED_STATES = ["DONE", "REJECT"];
exports.ORDER_PRE_ORDER_FILTERED_STATES = ["NEW", "CART", "CHECKOUT", "PAYMENT"];
exports.ORDER_KITCHEN_PROGRESS_STATES = ["ORDER", "COOKING", "ON_THE_WAY"];
exports.ORDER_KANBAN_DEFAULT_COMPLETED_WINDOW_HOURS = 24;
exports.ORDER_KANBAN_DEFAULT_NEW_WINDOW_MINUTES = 15;
const ORDER_STATE_SET = new Set(Object.keys(exports.ORDER_STATE_TRANSITIONS));
const OPERATOR_ALLOWED_TARGET_STATE_SET = new Set(exports.ORDER_OPERATOR_ALLOWED_TARGET_STATES);
const ORDER_COMPLETED_STATE_SET = new Set(exports.ORDER_COMPLETED_STATES);
const ORDER_PRE_ORDER_FILTERED_STATE_SET = new Set(exports.ORDER_PRE_ORDER_FILTERED_STATES);
const ORDER_KITCHEN_PROGRESS_STATE_SET = new Set(exports.ORDER_KITCHEN_PROGRESS_STATES);
function getUserGroupNames(user) {
    if (!Array.isArray(user === null || user === void 0 ? void 0 : user.groups))
        return [];
    return user.groups
        .map((group) => String((group === null || group === void 0 ? void 0 : group.name) || "").trim().toLowerCase())
        .filter((name) => name.length > 0);
}
function isOperatorUser(user) {
    if (user === null || user === void 0 ? void 0 : user.isAdministrator)
        return false;
    const names = getUserGroupNames(user);
    return names.some((name) => (name === "operator" ||
        name.includes("operator") ||
        name.includes("оператор")));
}
function isValidOrderState(state) {
    const normalized = String(state || "");
    return ORDER_STATE_SET.has(normalized);
}
function isCompletedOrderState(state) {
    const normalized = String(state || "");
    return ORDER_COMPLETED_STATE_SET.has(normalized);
}
function isPreOrderFilteredState(state) {
    const normalized = String(state || "");
    return ORDER_PRE_ORDER_FILTERED_STATE_SET.has(normalized);
}
function isKitchenProgressOrderState(state) {
    const normalized = String(state || "");
    return ORDER_KITCHEN_PROGRESS_STATE_SET.has(normalized);
}
function getAllowedOrderTransitions(state) {
    const normalizedState = String(state || "");
    return exports.ORDER_STATE_TRANSITIONS[normalizedState] || [];
}
function getAllowedOrderTransitionsByRole(state, operatorLimited) {
    const allowedTransitions = getAllowedOrderTransitions(state);
    if (!operatorLimited) {
        return allowedTransitions;
    }
    return allowedTransitions.filter((targetState) => OPERATOR_ALLOWED_TARGET_STATE_SET.has(targetState));
}
