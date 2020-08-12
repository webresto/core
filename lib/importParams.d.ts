import Dish from "../models/Dish";
import Group from "../models/Group";
declare type importParamFunction = (obj: Dish | Group) => Promise<void>;
export default function (obj: Dish | Group): Promise<void>;
export declare function addImportParam(label: string, fn: importParamFunction): void;
export {};
