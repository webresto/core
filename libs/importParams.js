"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
exports.addImportParam = addImportParam;
let importFns = [];
/**
 * Parameters for importing dishes and groups during synchronization from RMS adapter
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
        //@ts-ignore
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
/**
 * Adding a custom import function, the function takes a dish or group, can change their fields as desired, saving
 * the model after changes is not necessary, the import processing module will do it
 * @param label - label for debugging
 * @param fn - function to do
 */
function addImportParam(label, fn) {
    importFns.push({ label, fn });
}
/**
 * EXAMPLE
 */
// addImportParam('example', async (obj: DishRecord | Group) => {
//   sails.log.info(obj);
// });
