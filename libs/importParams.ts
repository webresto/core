import { AdditionalInfo } from "./checkExpression";
import Dish from "../models/Dish";
import Group from "../models/Group";

type importParamFunction = (obj: Dish | Group) => Promise<void>;
type importParamObject = {
  fn: importParamFunction;
  label: string;
};

let importFns: importParamObject[] = [];

/**
 * Параметры импорта блюд и групп при синхронизации из RMS адаптера
 * @param obj
 */
export default async function (obj: Dish | Group): Promise<void> {
  if (!obj || !obj.additionalInfo) {
    return;
  }

  try {
    let ai;
    try {
      ai = <AdditionalInfo>JSON.parse(obj.additionalInfo);
    } catch (e) {}
    if (!ai) return;
    const keys = ["visible", "workTime", "promo", "modifier"];
    for (let key of keys) if (ai[key] !== undefined) obj[key] = ai[key];

    for (let importFn of importFns) {
      try {
        await importFn.fn(obj);
      } catch (e) {
        sails.log.error("core > importParams 2 >\nerror in import param with label", importFn.label, "\n", e);
      }
    }
  } catch (e) {
    sails.log.error("core > importParams 1 >", e);
  }
}

/**
 * Добавление кастомной функции импорта, функция принимает блюдо или группу, может менять их поля как угодно, сохранять
 * модель после изменений не обязательно, это сделает модуль обработки импорта
 * @param label - label for debugging
 * @param fn - function to do
 */
export function addImportParam(label: string, fn: importParamFunction) {
  importFns.push({ label, fn } as importParamObject);
}

/**
 * EXAMPLE
 */
// addImportParam('example', async (obj: Dish | Group) => {
//   sails.log.info(obj);
// });
