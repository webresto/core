const sleep = require("util").promisify(setTimeout);
type func = (...args: any) => any | Promise<any>;
import Group, { GetGroupType } from "../models/Group";
import Dish from "../models/Dish";
import PaymentDocument from "../models/PaymentDocument"
import Order, { PaymentBack } from '../models/Order';
import Customer from "../interfaces/Customer";
import Address from "../interfaces/Address";
import Settings from "../models/Settings"
import User from "../models/User";
import { Payment } from "../interfaces/Payment";
import OrderDish from "../models/OrderDish"
import Maintenance from "../models/Maintenance"
import { DialogBox } from "./DialogBox";


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
    "rms-sync:before-each-group-item": [Group],
    "rms-sync:before-each-product-item": [Dish]
    "rms-sync:after-sync-products": []
    "rms-sync:out-of-stocks-before-each-product-item": [Pick<Dish, "balance" | "rmsId">]
    "core:product-before-create": [Dish]
    "core:payment-document-check": [PaymentDocument]
    "core:payment-document-paid": [PaymentDocument]
    "core:payment-document-checked-document": [PaymentDocument]
    "core:order-after-order": [Order]
    "core:order-order-delivery": [Order]
    "core:order-before-order": [Order]
    "core:order-order": [Order]
    "core:order-order-self-service": [Order]
    "core:order-is-self-service": [Order, Customer, boolean, Address]
    "core:order-check": [Order, Customer, boolean, Address, string]
    "core:order-after-check-counting": [Order]
    "core:order-before-check": [Order, Customer, boolean, Address]
    "core:order-check-delivery": [Order]
    [key: `settings:${string}`]: [Settings];
    "core:user-after-create": [User]
    "core:payment-document-before-create": [Payment]
    "core:order-after-dopaid": [Order]
    "core:order-after-count": [Order]
    "core:count-after-delivery-cost": [Order]
    "core:order-after-check-delivery": [Order]
    "core:count-before-delivery-cost": [Order]
    "core:order-after-promotion": [Order]
    "core:count-before-promotion": [Order]
    "core:orderproduct-change-amount": [OrderDish]
    "core:order-return-full-order-destroy-orderdish": [Dish, Order]
    "core:order-before-count": [Order]
    "core:order-payment": [Order, PaymentBack]
    "core:maintenance-enabled": [Maintenance]
    "core:maintenance-disabled": []
    "core:group-get-menu": [Group[], string]
    "core:group-get-groups": [GetGroupType, { [groupId: string]: string }]
    "core:group-after-create": [Group]
    "core:group-before-update": [Group]
    "core:group-after-update": [Group]
    "core:group-before-create": [Group]
    'core:product-after-create': [Dish]
    'core:product-after-update': [Dish]
    'core:product-before-update': [Dish]
    "core:product-get-dishes": [Dish[]]
    "dialog-box:new": [DialogBox]
    "dialog-box:answer-received": [string, string]
    "core:add-product-before-write": [Order, Dish]
  }
}

/**
 * A class that allows you to create events and wait for the execution of their subscriptions, whether it is a synchronous function or a function that returns
 * Promise.At the moment of execution of the event, it starts all execution subscriptions, remembering the result of each (successful,
 * with an error or timed out).
 */
export default class AwaitEmitter {
  events: Event[];
  name: string;
  timeout: number;

  /**
   * @param name - name of the new emitter
   * @param timeout - specifies how many milliseconds to wait for functions that return a Promise.
   */
  constructor(name: string, timeout?: number) {
    this.name = name;
    this.timeout = timeout || 1000;
    this.events = [];
  }

  /**
   * Remove event subscription
   * @param name - event name
   * @param id - subscriber ID to remove
   */
  off<N extends keyof IAwaitEmitter>(name: N, id: string): AwaitEmitter {
    const _name = name.toLowerCase().replace(/[^a-z]/ig, '');
    const event = this.events.find((e) => e.name === name);
    if (event) {
      const index = event.fns.findIndex((f) => f.id === id);
      if (index !== -1) {
        event.fns.splice(index, 1); // Remove the subscriber
      }
    }
    return this;
  }

  /**
   * Event subscription
   * @param name - event name
   * @param id
   * @param fn - subscriber function
   */
  on<N extends keyof IAwaitEmitter>(name: N, id: string, fn: (...args: [...IAwaitEmitter[N], number]) => void): AwaitEmitter {
    const _name = name.toLowerCase().replace(/[^a-z]/ig, '');
    let event = this.events.find((e) => e.name === _name);
    if (!event) {
      event = new Event(_name);
      this.events.push(event);
    }

    const index = event.fns.findIndex((f) => f.id === id);
    if (index !== -1) {
      event.fns[index] = { fn: fn, id: id };
    } else {
      event.fns.push({ fn: fn, id: id });
    }

    return this;
  }

  /**
   * Emits an event with name and args.If the subscriber function does not return a Promise, then it is considered synchronous
   * and is executed immediately, if the listener function returns a Promise, then it, along with the rest of the same listeners
   * runs in parallel and may time out.If the listener is then executed after
   * timeout, an appropriate message will be displayed
   * @param name - event name
   * @param args - arguments
   * @return Array of Response objects
   */

  async emit<N extends keyof IAwaitEmitter>(name: N, ...args: [...IAwaitEmitter[N],number?]): Promise<Response[]> 
  {
    const _name = name.toLowerCase().replace(/[^a-z]/ig, '');
    const that = this;
    const event = this.events.find((l) => l.name === _name);
    if (!event) return [];
    let timeout;
    if (typeof args[args.length-1] === "number"){
      timeout = args[args.length-1];
    } else {
      timeout = that.timeout;
      args.push(timeout)
    }

    const res: Response[] = [];
    const executor = event.fns.map(
      (f) =>
        async function () {
          try {
            if (sails.config.log && sails.config.log.level === "silly") {
              let debugRay = "ROUND: " + Math.floor(Math.random() * 1000000000) + 1 + " < " + new Date();
              //@ts-ignore
              args = args.map((arg) => {
                if (typeof arg === "object") {
                  return new Proxy(arg, {
                    set: function (target, key, value) {
                      let id = `
  -----------------------------------------------------------------
  Event: \x1b[40m\x1b[33m\x1b[5m ${name} <- ${f.id}  \x1b[0m : ${debugRay}
  \x1b[33m${key as string} : ${JSON.stringify(value, null, 2)} \x1b[0m
    
  method listing:
  
  ${f.fn}
  
  \x1b[32m ↷↷↷↷↷↷↷↷↷↷↷
  ${JSON.stringify(target, null, 2)}
  
  
  TRACE: 
                      `
                      console.trace(id)
                      target[key] = value;
                      return true;
                    },
                  });
                } else {
                  return arg;
                }
              });
            } //silly

            const r = f.fn.apply(that, args);

            // If this is a promise, then we are waiting
            if (!!r && (typeof r === "object" || typeof r === "function") && typeof r.then === "function") {
              // from isPromise
              let timeoutEnd = false;
              let successEnd = false;

              // stop timer
              const timeout = async function () {
                await sleep(timeout);
                if (!successEnd) {
                  timeoutEnd = true;
                  res.push(new Response(f.id, null, null, true));
                }
              };

              const decorator = async function () {
                const now = new Date();
                try {
                  const res1 = await r;
                  if (!timeoutEnd) {
                    successEnd = true;
                    res.push(new Response(f.id, res1));
                  } else {
                    const listenerName = f.id || "some";
                    sails.log.error(listenerName, "event of action", name, "in", that.name, "emitter end after", new Date().getTime() - now.getTime(), "ms");
                  }
                } catch (e) {
                  successEnd = true;
                  res.push(new Response(f.id, null, e));
                }
              };

              await Promise.race([timeout(), decorator()]);

              // If the function is not a promise, then execute it immediately
            } else {
              try {
                res.push(new Response(f.id, r));
              } catch (e) {
                res.push(new Response(f.id, null, e));
              }
            }
          } catch (e) {
            res.push(new Response(f.id, null, e));
          }
        }
    );

    await Promise.all(executor.map((f) => f()));

    return res;
  }
}

/**
 * Event object, stores the name of the event and its listeners
 */
class Event {
  name: string;
  fns: {
    fn: func;
    id: string;
  }[];

  constructor(name: string) {
    this.name = name;
    this.fns = [];
  }
}

/**
 * Response object, contains a mark where the listener came from, the state of the result (success, error, timeout), and the result or
 * error returned or called by the function
 */
class Response {
  id: string;
  state: "success" | "error" | "timeout";
  result: any;
  error: any;

  constructor(id: string, result: any, error?: any, timeout?: boolean) {
    this.id = id;
    this.result = result;
    this.error = error;
    this.state = timeout ? "timeout" : this.error ? "error" : "success";
    if (error) {
      sails.log.error(`Emitter with id [${id ?? 'some'}], was finished with error:`, error)
    }
  }
}
