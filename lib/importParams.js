"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addImportParam = void 0;
let importFns = [];
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
        const keys = ['visible', 'workTime', 'promo', 'modifier'];
        for (let key of keys)
            if (ai[key] !== undefined)
                obj[key] = ai[key];
        for (let importFn of importFns) {
            try {
                await importFn.fn(obj);
            }
            catch (e) {
                sails.log.error('core > importParams 2 >\nerror in import param with label', importFn.label, '\n', e);
            }
        }
    }
    catch (e) {
        sails.log.error('core > importParams 1 >', e);
    }
}
exports.default = default_1;
function addImportParam(label, fn) {
    importFns.push({ label, fn });
}
exports.addImportParam = addImportParam;
