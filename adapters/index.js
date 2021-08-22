"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = exports.ImageA = exports.Map = exports.RMS = void 0;
const fs = require("fs");
const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined
    ? "@webresto"
    : process.env.WEBRESTO_MODULES_PATH;
/**
 * Отдаёт запрашиваемый RMS-адаптер
 */
class RMS {
    static getAdapter(adapterName) {
        // For factory we use different dirrectory for modules
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-rms-adapter";
        adapterLocation = fs.existsSync(adapterLocation)
            ? adapterLocation
            : "@webresto/" + adapterName.toLowerCase() + "-rms-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.RMS[adapterName.toUpperCase()];
        }
        catch (e) {
            sails.log.error("CORE > getAdapter RMS > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.RMS = RMS;
/**
 * Отдаёт запрашиваемый Map-адаптер
 */
class Map {
    static getAdapter(adapterName) {
        let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-map-adapter";
        adapterLocation = fs.existsSync(adapterLocation)
            ? adapterLocation
            : "@webresto/" + adapterName.toLowerCase() + "-map-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.MapAdapter.default;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Map > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.Map = Map;
/**
 * Отдаёт запрашиваемый Image-адаптер
 */
class ImageA {
    static getAdapter(adapterName) {
        let adapterLocation = WEBRESTO_MODULES_PATH +
            "/" +
            adapterName.toLowerCase() +
            "-image-adapter";
        adapterLocation = fs.existsSync(adapterLocation)
            ? adapterLocation
            : "@webresto/" + adapterName.toLowerCase() + "-image-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.ImageAdapter.default;
        }
        catch (e) {
            sails.log.error("CORE > getAdapter ImageA > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.ImageA = ImageA;
/**
 * Отдаёт запрашиваемый Payment-адаптер
 */
class Payment {
    static getAdapter(adapterName) {
        let adapterLocation = WEBRESTO_MODULES_PATH +
            "/" +
            adapterName.toLowerCase() +
            "-payment-adapter";
        adapterLocation = fs.existsSync(adapterLocation)
            ? adapterLocation
            : "@webresto/" + adapterName.toLowerCase() + "-payment-adapter";
        try {
            const adapter = require(adapterLocation);
            return adapter.PaymentAdapter[adapterName.toUpperCase()];
        }
        catch (e) {
            sails.log.error("CORE > getAdapter Payment > error; ", e);
            throw new Error("Module " + adapterLocation + " not found");
        }
    }
}
exports.Payment = Payment;
