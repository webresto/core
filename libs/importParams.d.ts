/**
 * // TODO: Abandoned because we have gone to global changes from Dish to Item
 */
import { DishRecord } from "../models/Dish";
import { GroupRecord } from "../models/Group";
type importParamFunction = (obj: DishRecord | GroupRecord) => Promise<void>;
/**
 * Parameters for importing dishes and groups during synchronization from RMS adapter
 * @param obj
 */
export default function (obj: DishRecord | GroupRecord): Promise<void>;
/**
 * Adding a custom import function, the function takes a dish or group, can change their fields as desired, saving
 * the model after changes is not necessary, the import processing module will do it
 * @param label - label for debugging
 * @param fn - function to do
 */
export declare function addImportParam(label: string, fn: importParamFunction): void;
export {};
/**
 * EXAMPLE
 */
