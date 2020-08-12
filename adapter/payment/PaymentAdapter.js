"use strict";
exports.__esModule = true;
var PaymentAdapter = (function () {
    function PaymentAdapter(InitPaymentAdapter) {
        this.InitPaymentAdapter = InitPaymentAdapter;
        PaymentMethod.alive(this.InitPaymentAdapter);
    }
    PaymentAdapter.getInstance = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return PaymentAdapter.prototype;
    };
    ;
    return PaymentAdapter;
}());
exports["default"] = PaymentAdapter;
