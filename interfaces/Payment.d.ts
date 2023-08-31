/**
 * Описывает платежный документ
 * paid?: Признак того что документ оплачен
 * amount: Сумма
 * isOrderPayment?: Является оплатой корзины
 * originModel: Название модели иницировавшей оплату
 * PaymentMethod: Адаптер через которую совершался платеж
 * comment?: Комментарий
 * error?
 */
export interface Payment {
    id: string;
    paid?: boolean;
    amount: number;
    originModelId: string;
    externalId?: string;
    originModel: string;
    paymentMethod: string;
    comment?: string;
    error?: any;
    data?: any;
}
export interface PaymentResponse extends Payment {
    redirectLink?: string;
}
