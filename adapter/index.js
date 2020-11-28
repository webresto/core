"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = exports.ImageA = exports.Map = exports.RMS = void 0;
/**
 * Отдаёт запрашиваемый RMS-адаптер
 */
class RMS {
    static getAdapter(adapterName) {
        const adapterFind = '@webresto/' + adapterName.toLowerCase() + '-rms-adapter';
        try {
            const adapter = require(adapterFind);
            return adapter.RMS[adapterName.toUpperCase()];
        }
        catch (e) {
            sails.log.error("CORE > getAdapter RMS > error; ", e);
            throw new Error('Module ' + adapterFind + ' not found');
        }
    }
}
exports.RMS = RMS;
/**
 * Отдаёт запрашиваемый Map-адаптер
 */
class Map {
    static getAdapter(adapterName) {
        adapterName = '@webresto/' + adapterName.toLowerCase() + '-map-adapter';
        try {
            const adapter = require(adapterName);
            return adapter.MapAdapter.default;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Map > error; ", e);
            throw new Error('Module ' + adapterName + ' not found');
        }
    }
}
exports.Map = Map;
/**
 * Отдаёт запрашиваемый Image-адаптер
 */
class ImageA {
    static getAdapter(adapterName) {
        adapterName = '@webresto/' + adapterName.toLowerCase() + '-image-adapter';
        try {
            const adapter = require(adapterName);
            return adapter.ImageAdapter.default;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter ImageA > error; ", e);
            throw new Error('Module ' + adapterName + ' not found');
        }
    }
}
exports.ImageA = ImageA;
/**
* Отдаёт запрашиваемый Payment-адаптер
*/
class Payment {
    static getAdapter(adapterName) {
        adapterName = '@webresto/' + adapterName.toLowerCase() + '-payment-adapter';
        try {
            const adapter = require(adapterName);
            return adapter.PaymentAdapter[adapterName.toUpperCase()];
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Payment > error; ", e);
            throw new Error('Module ' + adapterName + ' not found');
        }
    }
}
exports.Payment = Payment;
