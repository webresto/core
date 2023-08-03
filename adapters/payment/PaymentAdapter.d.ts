import { Payment, PaymentResponse } from "../../interfaces/Payment";
import PaymentDocument from "../../models/PaymentDocument";
import { PaymentMethodType } from "../../libs/enums/PaymentMethodTypes";
/**
 * The abstract class of the Payment adapter. Used to create new payment system adapters.
 */
export type Config = {
    [key: string]: Config | number | boolean | string | null | undefined;
};
export interface InitPaymentAdapter {
    title: string;
    type: PaymentMethodType;
    adapter: string;
    description?: string;
    config: Config;
}
export default abstract class PaymentAdapter {
    readonly InitPaymentAdapter: InitPaymentAdapter;
    config: Config;
    protected constructor(InitPaymentAdapter: InitPaymentAdapter);
    /**
     * Make new payment
     * @param Payment - payment document
     * @return Результат работы функции, тело ответа и код результата
     */
    abstract createPayment(payment: Payment, backLinkSuccess: string, backLinkFail: string): Promise<PaymentResponse>;
    /**
     * Проверка Оплаты
     * @param paymentDocument - Платежный документ
     * @return результат работы функции, тело ответа и код результата (сохранять модель не нужно)
     */
    abstract checkPayment(paymentDocument: PaymentDocument): Promise<PaymentDocument>;
    /**
     * Метод для создания и получения уже существующего Payment adapterа
     * @param params - параметры для инициализации
     */
    static getInstance(...params: any[]): PaymentAdapter;
}
