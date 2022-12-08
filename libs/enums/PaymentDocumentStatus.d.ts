/**
  REGISTRED - заказ зарегистрирован, но не оплачен;
  PAID - проведена полная авторизация суммы заказа;
  CANCEL - авторизация отменена;
  REFUND - по транзакции была проведена операция возврата;
  DECLINE - авторизация отклонена.
*/
export declare enum PaymentDocumentStatus {
    NEW = "NEW",
    REGISTRED = "REGISTRED",
    PAID = "PAID",
    CANCEL = "CANCEL",
    REFUND = "REFUND",
    DECLINE = "DECLINE"
}
