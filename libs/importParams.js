"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addImportParam = void 0;
let importFns = [];
/**
 * Параметры импорта блюд и групп при синхронизации из RMS адаптера
 * @param obj
 */
async function default_1(obj) {
    if (!obj || !obj.additionalInfo) {
        return;
    }
    try {
        let ai;
        try {
            ai = JSON.parse(obj.additionalInfo);
        }
        catch (e) { }
        if (!ai)
            return;
        const keys = ["visible", "worktime", "promo", "modifier"];
        for (let key of keys)
            if (ai[key] !== undefined)
                obj[key] = ai[key];
        for (let importFn of importFns) {
            try {
                await importFn.fn(obj);
            }
            catch (e) {
                sails.log.error("core > importParams 2 >\nerror in import param with label", importFn.label, "\n", e);
            }
        }
    }
    catch (e) {
        sails.log.error("core > importParams 1 >", e);
    }
}
exports.default = default_1;
/**
 * Добавление кастомной функции импорта, функция принимает блюдо или группу, может менять их поля как угодно, сохранять
 * модель после изменений не обязательно, это сделает модуль обработки импорта
 * @param label - label for debugging
 * @param fn - function to do
 */
function addImportParam(label, fn) {
    importFns.push({ label, fn });
}
exports.addImportParam = addImportParam;
/**
 * EXAMPLE
 */
// addImportParam('example', async (obj: Dish | Group) => {
//   sails.log.info(obj);
// });
