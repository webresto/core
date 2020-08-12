"use strict";
exports.__esModule = true;
exports.Payment = exports.ImageA = exports.Map = exports.RMS = void 0;
var RMS = (function () {
    function RMS() {
    }
    RMS.getAdapter = function (adapterName) {
        var adapterFind = '@webresto/' + adapterName.toLowerCase() + '-rms-adapter';
        try {
            var adapter = require(adapterFind);
            return adapter.RMS[adapterName.toUpperCase()];
        }
        catch (e) {
            throw new Error('Module ' + adapterFind + ' not found');
        }
    };
    return RMS;
}());
exports.RMS = RMS;
var Map = (function () {
    function Map() {
    }
    Map.getAdapter = function (adapterName) {
        adapterName = '@webresto/' + adapterName.toLowerCase() + '-map-adapter';
        try {
            var adapter = require(adapterName);
            return adapter.MapAdapter["default"];
        }
        catch (e) {
            throw new Error('Module ' + adapterName + ' not found');
        }
    };
    return Map;
}());
exports.Map = Map;
var ImageA = (function () {
    function ImageA() {
    }
    ImageA.getAdapter = function (adapterName) {
        adapterName = '@webresto/' + adapterName.toLowerCase() + '-image-adapter';
        try {
            var adapter = require(adapterName);
            return adapter.ImageAdapter["default"];
        }
        catch (e) {
            throw new Error('Module ' + adapterName + ' not found');
        }
    };
    return ImageA;
}());
exports.ImageA = ImageA;
var Payment = (function () {
    function Payment() {
    }
    Payment.getAdapter = function (adapterName) {
        adapterName = '@webresto/' + adapterName.toLowerCase() + '-payment-adapter';
        try {
            var adapter = require(adapterName);
            return adapter.PaymentAdapter[adapterName.toUpperCase()];
        }
        catch (e) {
            throw new Error('Module ' + adapterName + ' not found');
        }
    };
    return Payment;
}());
exports.Payment = Payment;
