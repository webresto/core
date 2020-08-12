import Cart from "../models/Cart";
import Actions, { ActionParams } from "../modelsHelp/Actions";
declare const actions: Actions;
export default actions;
declare type actionFunc1 = (params?: ActionParams, ...args: any) => Promise<Cart>;
declare type actionFunc2 = (...args: any) => Promise<Cart>;
declare type actionFunc = actionFunc1 | actionFunc2;
export declare function addAction(name: string, fn: actionFunc): void;
export declare function getAllActionsName(): string[];
