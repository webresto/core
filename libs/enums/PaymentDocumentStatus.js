"use strict";
/**
  REGISTRED - заказ зарегистрирован, но не оплачен;
  PAID - проведена полная авторизация суммы заказа;
  CANCEL - авторизация отменена;
  REFUND - по транзакции была проведена операция возврата;
  DECLINE - авторизация отклонена.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentDocumentStatus = void 0;
var PaymentDocumentStatus;
(function (PaymentDocumentStatus) {
    PaymentDocumentStatus["NEW"] = "NEW";
    PaymentDocumentStatus["REGISTRED"] = "REGISTRED";
    PaymentDocumentStatus["PAID"] = "PAID";
    PaymentDocumentStatus["CANCEL"] = "CANCEL";
    PaymentDocumentStatus["REFUND"] = "REFUND";
    PaymentDocumentStatus["DECLINE"] = "DECLINE";
})(PaymentDocumentStatus = exports.PaymentDocumentStatus || (exports.PaymentDocumentStatus = {}));
