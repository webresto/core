"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.addImportParam = void 0;
var importFns = [];
function default_1(obj) {
    return __awaiter(this, void 0, void 0, function () {
        var ai, keys, _i, keys_1, key, _a, importFns_1, importFn, e_1, e_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!obj || !obj.additionalInfo) {
                        return [2];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 8, , 9]);
                    ai = void 0;
                    try {
                        ai = JSON.parse(obj.additionalInfo);
                    }
                    catch (e) { }
                    if (!ai)
                        return [2];
                    keys = ['visible', 'workTime', 'promo', 'modifier'];
                    for (_i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                        key = keys_1[_i];
                        if (ai[key] !== undefined)
                            obj[key] = ai[key];
                    }
                    _a = 0, importFns_1 = importFns;
                    _b.label = 2;
                case 2:
                    if (!(_a < importFns_1.length)) return [3, 7];
                    importFn = importFns_1[_a];
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 5, , 6]);
                    return [4, importFn.fn(obj)];
                case 4:
                    _b.sent();
                    return [3, 6];
                case 5:
                    e_1 = _b.sent();
                    sails.log.error('core > importParams 2 >\nerror in import param with label', importFn.label, '\n', e_1);
                    return [3, 6];
                case 6:
                    _a++;
                    return [3, 2];
                case 7: return [3, 9];
                case 8:
                    e_2 = _b.sent();
                    sails.log.error('core > importParams 1 >', e_2);
                    return [3, 9];
                case 9: return [2];
            }
        });
    });
}
exports["default"] = default_1;
function addImportParam(label, fn) {
    importFns.push({ label: label, fn: fn });
}
exports.addImportParam = addImportParam;
