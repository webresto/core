import Cart from "../models/Cart";
import { DirectDistance, Time } from "../interfaces/Cause";
import Condition from "../../checkout/models/Condition";
declare type customCause = {
  name: string;
  needCart: boolean;
  fn: causeFunc;
};
declare type causeFunc = (condition: Condition, cart?: Cart) => boolean | Promise<boolean>;
/**
 * Check some condition from some cart
 * @param {string} condition - condition for check
 * @param {object} cart - cart for check
 * @returns {Promise<boolean>}
 */
export default function causes(condition: Condition, cart: Cart): Promise<boolean>;
/**
 * Add new cause in custom causes
 * @param name - cause name
 * @param needCart - if true in fn will be cart as second param
 * @param fn - call back to check cause in condition and cart
 */
export declare function addCauseByFields(name: string, needCart: boolean, fn: causeFunc): void;
/**
 * Add new cause in custom causes
 * @param cause - new cause object
 */
export declare function addCause(cause: customCause): void;
/**
 * Check that current time is in time of paras
 * @param {array} timeArray
 * @example
 * timeArray: [
 *  {
 *    dayOfWeek: 'monday',
 *    start: '8:00',
 *    end: '18:00'
 *  },
 *  {...}
 * ]
 * @returns {boolean}
 */
export declare function checkTime(timeArray: Time[]): boolean;
/**
 * Check that in (a,b,c) c is between a and b
 * @param {number} [from] is a
 * @param {number} [to] is b
 * @param {number} [a] is c
 * @returns {boolean}
 */
export declare function between(from: number, to: number, a: number): boolean;
/**
 * Check distance between cart address and data DirectDistance info
 * @param cart
 * @param data
 */
export declare function checkDistance(cart: Cart, data: DirectDistance): Promise<boolean>;
export declare enum Weekdays {
  "sunday" = 0,
  "monday" = 1,
  "tuesday" = 2,
  "wednesday" = 3,
  "thursday" = 4,
  "friday" = 5,
  "saturday" = 6,
}
export {};
