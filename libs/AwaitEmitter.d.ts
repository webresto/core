type func = (...args: any) => any | Promise<any>;
import Customer from "../interfaces/Customer";
import Address from "../interfaces/Address";
import { Payment } from "../interfaces/Payment";
import { DialogBox } from "./DialogBox";
import { InitCheckout } from "./helpers/OrderHelper";
import { GetGroupType, GroupRecord } from "../models/Group";
import { DishRecord } from "../models/Dish";
import { PaymentDocumentRecord } from "../models/PaymentDocument";
import { SettingsRecord } from "../models/Settings";
import { UserRecord } from "../models/User";
import { OrderDishRecord } from "../models/OrderDish";
import { OrderRecord, PaymentBack } from "../models/Order";
import { MaintenanceRecord } from "../models/Maintenance";
import { PromotionRecord } from "../models/Promotion";
/**
 * Naming conventions can greatly enhance the readability and understanding of code, especially for those who may not be familiar with it. Using a structured approach like "module:action-before/after-read/write" can make it intuitive. Let's break down the example "core:add-dish-before-write":

    "core" refers to the module or core functionality involved.
    "add-dish" indicates the action being performed, which is adding a dish.
    "before-write" suggests when this action occurs, in this case, it's before a write operation.

  So, this name indicates that within the core module, there's a function or process for adding a dish, and it happens before a write operation.
 *
 */
declare global {
    interface IAwaitEmitter {
        "rms-sync:before-each-group-item": [GroupRecord];
        "rms-sync:before-each-product-item": [DishRecord];
        "rms-sync:after-sync-products": [];
        "rms-sync:out-of-stocks-before-each-product-item": [Pick<DishRecord, "balance" | "rmsId">];
        "core:product-before-create": [DishRecord];
        "core:payment-document-check": [PaymentDocumentRecord];
        "core:payment-document-paid": [PaymentDocumentRecord];
        "core:payment-document-checked-document": [PaymentDocumentRecord];
        "core:order-after-order": [OrderRecord];
        "core:order-order-delivery": [OrderRecord];
        "core:order-before-order": [OrderRecord];
        "core:order-order": [OrderRecord];
        "core:order-order-self-service": [OrderRecord];
        "core:order-is-self-service": [OrderRecord, Customer, boolean, Address];
        "core:order-check": [OrderRecord, Customer, boolean, Address, string];
        "core:order-after-check-counting": [OrderRecord];
        "core:order-before-check": [OrderRecord, Customer, boolean, Address];
        "core:order-check-delivery": [OrderRecord];
        [key: `settings:${string}`]: [SettingsRecord];
        "core:user-after-create": [UserRecord];
        "core:payment-document-before-create": [Payment];
        "core:order-after-dopaid": [OrderRecord];
        "core:order-after-count": [OrderRecord];
        "core:count-after-delivery-cost": [OrderRecord];
        "core:order-after-check-delivery": [OrderRecord];
        "core:count-before-delivery-cost": [OrderRecord];
        "core:order-after-promotion": [OrderRecord];
        "core:order-after-done": [OrderRecord, UserRecord, {
            isNewUser: boolean;
        }];
        "core:count-before-promotion": [OrderRecord];
        "core:orderproduct-change-amount": [OrderDishRecord];
        "core:order-return-full-order-destroy-orderdish": [DishRecord, OrderRecord];
        "core:order-before-count": [OrderRecord];
        "core:order-payment": [OrderRecord, PaymentBack];
        "core:order-init-checkout": [OrderRecord, InitCheckout];
        "core:maintenance-enabled": [MaintenanceRecord];
        "core:maintenance-disabled": [];
        "core:group-get-menu": [GroupRecord[], string];
        "core:group-get-groups": [GetGroupType, {
            [groupId: string]: string;
        }];
        "core:group-after-create": [GroupRecord];
        "core:group-before-update": [GroupRecord];
        "core:group-after-update": [GroupRecord];
        "core:group-before-create": [GroupRecord];
        'core:product-after-create': [DishRecord];
        'core:product-after-update': [DishRecord];
        'core:product-before-update': [DishRecord];
        "core:product-get-dishes": [DishRecord[]];
        "dialog-box:new": [DialogBox];
        "dialog-box:answer-received": [string, string];
        "core:add-product-before-write": [OrderRecord, DishRecord];
        "promotion-process:debug": [number, OrderRecord, PromotionRecord, any];
        "core:adapter-rms-sync-out-of-stock-touch": [];
        "core:order-after-create": [OrderRecord];
        "core:order-after-remove-dish": [OrderRecord, string, DishRecord, number, boolean];
    }
}
/**
 * A class that allows you to create events and wait for the execution of their subscriptions, whether it is a synchronous function or a function that returns
 * Promise.At the moment of execution of the event, it starts all execution subscriptions, remembering the result of each (successful,
 * with an error or timed out).
 */
export default class AwaitEmitter {
    readonly events: Event[];
    /** @deprecated not used */
    readonly name: string;
    readonly timeout: number;
    readonly declarations: {
        name: string;
        description: string;
    }[];
    /**
     * @param name - name of the new emitter
     * @param timeout - specifies how many milliseconds to wait for functions that return a Promise.
     */
    constructor(name: string, timeout?: number);
    /**
   * Declare event
   * Declarations are needed so that we can get a list of system events
   * @param name - event name
   * @param id - subscriber ID to remove
   */
    declare<N extends keyof IAwaitEmitter>(name: N, description?: string): void;
    /**
     * Issues one declaration per event
     * @param name event name
     * @returns
     */
    getDeclaration<N extends keyof IAwaitEmitter>(name: N): {
        name: string;
        description: string;
    };
    /**
     *Issuer of all declarations
     * @returns
     */
    getDeclarations(): {
        name: string;
        description: string;
    }[];
    /**
     * Remove event subscription
     * @param name - event name
     * @param id - subscriber ID to remove
     */
    off<N extends keyof IAwaitEmitter>(name: N, id: string): AwaitEmitter;
    /**
     * Event subscription
     * @param name - event name
     * @param id - subscriber id
     * @param handler - handler function
     */
    on<N extends keyof IAwaitEmitter>(name: N, id: string, handler: (...args: [...IAwaitEmitter[N], number]) => void): AwaitEmitter;
    /**
     * Emits an event with name and args.If the subscriber function does not return a Promise, then it is considered synchronous
     * and is executed immediately, if the listener function returns a Promise, then it, along with the rest of the same listeners
     * runs in parallel and may time out.If the listener is then executed after
     * timeout, an appropriate message will be displayed
     * @param name - event name
     * @param args - arguments
     * @return Array of HandlerResponse objects
     */
    emit<N extends keyof IAwaitEmitter>(name: N, ...args: [...IAwaitEmitter[N], number?]): Promise<HandlerResponse[]>;
}
/**
 * Event object, stores the name of the event and its listeners
 */
declare class Event {
    name: string;
    subscribers: {
        handler: func;
        id: string;
    }[];
    constructor(name: string);
}
/**
 * HandlerResponse object, contains a mark where the listener came from, the state of the result (success, error, timeout), and the result or
 * error returned or called by the function
 */
declare class HandlerResponse {
    id: string;
    state: "success" | "error" | "timeout";
    result: any;
    error: any;
    constructor(id: string, result: any, error?: any, timeout?: boolean);
}
export {};
