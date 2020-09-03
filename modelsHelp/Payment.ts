/**
 * Описывает платежный документ
 * paid?: Признак того что документ оплачен 
 * amount: Сумма 
 * isCartPayment?: Является оплатой корзины
 * originModel: Название модели иницировавшей оплату
 * PaymentMethod: Адаптер через которую совершался платеж
 * comment?: Комментарий
 * error? 
 */



export interface Payment {
  paid?: boolean 
  amount: number;
  paymentId: string;
  originModel: string;
  PaymentMethod: string;
  comment?: string;
  error?:any
}

export interface PaymentResponse extends Payment {
  redirectLink: string 
}
