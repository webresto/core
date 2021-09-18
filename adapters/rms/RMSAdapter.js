"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Абстрактный класс RMS адаптера. Используется для создания новых адаптеров RMS.
 */
class RMSAdapter {
    // TODO: надо убрать от сюда настройки синхронизации
    constructor(menuTime, balanceTime, streetsTime) {
        this.syncMenuTime = menuTime;
        this.syncBalanceTime = balanceTime;
        this.syncStreetsTime = streetsTime;
    }
    /**
     * Метод для создания и получения уже существующего RMS адаптера
     * @param params - параметры для инициализации
     */
    static getInstance(...params) {
        return RMSAdapter.prototype;
    }
}
exports.default = RMSAdapter;
