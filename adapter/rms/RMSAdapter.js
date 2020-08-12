"use strict";
exports.__esModule = true;
var RMSAdapter = (function () {
    function RMSAdapter(menuTime, balanceTime, streetsTime) {
        this.syncMenuTime = menuTime;
        this.syncBalanceTime = balanceTime;
        this.syncStreetsTime = streetsTime;
    }
    RMSAdapter.getInstance = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return RMSAdapter.prototype;
    };
    ;
    return RMSAdapter;
}());
exports["default"] = RMSAdapter;
