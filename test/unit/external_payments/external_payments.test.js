"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var TestPaymentSystem_1 = require("./TestPaymentSystem");
var payment_generator_1 = require("../../generators/payment.generator");
var chai_1 = require("chai");
describe('TestPaymentSystem & PaymentAdapter basic testing', function () {
    var _this = this;
    this.timeout(31000);
    var test_payment = payment_generator_1["default"]();
    it('Payment regtest', function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, TestPaymentSystem_1["default"].getInstance()];
                case 1:
                    result = _a.sent();
                    chai_1.expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
                    return [2];
            }
        });
    }); });
    it('Create payment test', function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, TestPaymentSystem_1["default"].getInstance().createPayment(test_payment, "http://back_url.com", "delay_3_sec")];
                case 1:
                    result = _a.sent();
                    chai_1.expect(result.redirectLink).to.equal("http://redirect_link.com");
                    return [2];
            }
        });
    }); });
    it('Testigt, not yet payment check', function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, TestPaymentSystem_1["default"].getInstance().checkPayment(test_payment)];
                case 1:
                    result = _a.sent();
                    chai_1.expect(result.paid).to.equal(false);
                    return [2];
            }
        });
    }); });
    it('Check done payment', function () { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, TestPaymentSystem_1["default"].getInstance().checkPayment(test_payment)];
                        case 1:
                            result = _a.sent();
                            chai_1.expect(result.paid).to.equal(true);
                            return [2];
                    }
                });
            }); }, 3000);
            return [2];
        });
    }); });
    it('Exit on timeout', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2];
        });
    }); });
});
