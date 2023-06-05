"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultBonusProgramAdater = void 0;
const BonusProgramAdapter_1 = require("../BonusProgramAdapter");
class DefaultBonusProgramAdater extends BonusProgramAdapter_1.default {
    getBalance(user) {
        throw new Error("Method not implemented.");
    }
    getTransactions(user, afterTime, limit, skip) {
        throw new Error("Method not implemented.");
    }
}
exports.DefaultBonusProgramAdater = DefaultBonusProgramAdater;
