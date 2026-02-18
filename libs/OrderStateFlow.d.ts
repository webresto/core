export declare const ORDER_STATE_TRANSITIONS: Record<string, string[]>;
export declare const ORDER_OPERATOR_ALLOWED_TARGET_STATES: string[];
export declare function isOperatorUser(user: any): boolean;
export declare function isValidOrderState(state: unknown): boolean;
export declare function getAllowedOrderTransitions(state: string): string[];
export declare function getAllowedOrderTransitionsByRole(state: string, operatorLimited: boolean): string[];
