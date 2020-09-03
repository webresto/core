/**
 * Описывает платежный документ
 * paid?: Признак того что документ оплачен
 * total: Сумма
 * id: уникальные Идентификатор
 * isCartPayment?: Является оплатой корзины
 * originModel: Название модели иницировавшей оплату
 * paymentAdapter: Адаптер через которую совершался платеж
 * data?: Дата и время
 * comment?: Комментарий
 * error?
 */
export interface Payment {
    paid?: boolean;
    amount: number;
    paymentId: string;
    originModel: string;
    PaymentMethod: string;
    comment?: string;
    error?: any;
}
export interface PaymentResponse extends Payment {
    redirectLink: string;
}
