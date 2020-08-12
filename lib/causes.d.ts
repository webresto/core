import Cart from "../models/Cart";
import { DirectDistance, Time } from "../modelsHelp/Cause";
import Condition from "../models/Condition";
declare type customCause = {
    name: string;
    needCart: boolean;
    fn: causeFunc;
};
declare type causeFunc = (condition: Condition, cart?: Cart) => boolean | Promise<boolean>;
export default function causes(condition: Condition, cart: Cart): Promise<boolean>;
export declare function addCauseByFields(name: string, needCart: boolean, fn: causeFunc): void;
export declare function addCause(cause: customCause): void;
export declare function checkTime(timeArray: Time[]): boolean;
export declare function between(from: number, to: number, a: number): boolean;
export declare function checkDistance(cart: Cart, data: DirectDistance): Promise<boolean>;
export declare enum Weekdays {
    'sunday' = 0,
    'monday' = 1,
    'tuesday' = 2,
    'wednesday' = 3,
    'thursday' = 4,
    'friday' = 5,
    'saturday' = 6
}
export {};
