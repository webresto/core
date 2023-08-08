'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="./types/globalTypes.d.ts" />
__exportStar(require("./models/BonusProgram"), exports);
__exportStar(require("./models/Dish"), exports);
__exportStar(require("./models/Group"), exports);
__exportStar(require("./models/Maintenance"), exports);
__exportStar(require("./models/MediaFile"), exports);
__exportStar(require("./models/OneTimePassword"), exports);
__exportStar(require("./models/Order"), exports);
__exportStar(require("./models/OrderDish"), exports);
__exportStar(require("./models/PaymentDocument"), exports);
__exportStar(require("./models/PaymentMethod"), exports);
__exportStar(require("./models/Place"), exports);
__exportStar(require("./models/Settings"), exports);
__exportStar(require("./models/City"), exports);
__exportStar(require("./models/Street"), exports);
__exportStar(require("./models/User"), exports);
__exportStar(require("./models/UserBonusProgram"), exports);
__exportStar(require("./models/UserBonusTransaction"), exports);
__exportStar(require("./models/UserDevice"), exports);
__exportStar(require("./models/UserLocation"), exports);
__exportStar(require("./models/UserOrderHistory"), exports);
__exportStar(require("./models/Promotion"), exports);
module.exports = function (sails) {
    return {
        defaults: require('./hook/defaults'),
        initialize: require('./hook/initialize').default(sails)
    };
};
module.exports.HookTools = require("./libs/hookTools");
