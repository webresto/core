import Dish from "@webresto/core/models/Dish";
import Group from "@webresto/core/models/Group";

declare type importParamFunction = (obj: Dish | Group) => Promise<void>;
/**
 * Параметры импорта блюд и групп при синхронизации из RMS адаптера
 * @param obj
 */
export default function (obj: Dish | Group): Promise<void>;

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
