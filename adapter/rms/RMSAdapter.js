"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RMSAdapter {
    constructor(menuTime, balanceTime, streetsTime) {
        this.syncMenuTime = menuTime;
        this.syncBalanceTime = balanceTime;
        this.syncStreetsTime = streetsTime;
    }
    static getInstance(...params) { return RMSAdapter.prototype; }
    ;
}
exports.default = RMSAdapter;
