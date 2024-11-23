/**
 * // TODO: Abandoned because we have gone to global changes from Dish to Item
 */
import { DishRecord } from "../models/Dish";
import { GroupRecord } from "../models/Group";
type importParamFunction = (obj: DishRecord | GroupRecord) => Promise<void>;
/**
 * Параметры импорта блюд и групп при синхронизации из RMS adapter
 * @param obj
 */
export default function (obj: DishRecord | GroupRecord): Promise<void>;
/**
 * Добавление кастомной функции импорта, функция принимает блюдо или группу, может менять их поля как угодно, сохранять
 * модель после изменений не обязательно, это сделает модуль обработки импорта
 * @param label - label for debugging
 * @param fn - function to do
 */
export declare function addImportParam(label: string, fn: importParamFunction): void;
export {};
/**
 * EXAMPLE
 */
