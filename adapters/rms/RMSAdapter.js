"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * An abstract RMS adapter class. Used to create new RMS adapters.
 */
class RMSAdapter {
    // TODO: надо убрать от сюда настройки синхронизации
    constructor(menuTime, balanceTime, streetsTime) {
        this.syncMenuTime = menuTime;
        this.syncBalanceTime = balanceTime;
        this.syncStreetsTime = streetsTime;
    }
    /**
     * Method for creating and getting an already existing RMS adapter
     * @param params - parameters for initialization
     */
    static getInstance(...params) {
        return RMSAdapter.prototype;
    }
}
exports.default = RMSAdapter;
