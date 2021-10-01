/**
 * Описывает инит обеькт для регистрации "Способ оплаты"
 */
export interface InitPaymentAdapter {
    title: string;
    type: string;
    adapter: string;
    description?: string;
}
