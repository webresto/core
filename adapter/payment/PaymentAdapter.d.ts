import Payment from "../../modelsHelp/Payment";
import { InitPaymentAdapter } from "../../models/PaymentMethod";
/**
 * Абстрактный класс Payment адаптера. Используется для создания новых адаптеров платежных систем.
 */
export default abstract class PaymentAdapter {
    protected readonly InitPaymentAdapter: InitPaymentAdapter;
    protected constructor(InitPaymentAdapter: InitPaymentAdapter);
    /**
     * Создание Оплаты
     * @param Payment - Платежный tscдокумент
     * @return Результат работы функции, тело ответа и код результата
     */
    abstract createPayment(payment: Payment, backLink: string): Promise<CreatePaymentReturn>;
    /**
     * Проверка Оплаты
     * @param Payment - Платежный документ
     * @return результат работы функции, тело ответа и код результата
     */
    abstract checkPayment(payment: Payment): Promise<CheckPaymentReturn>;
    /**
     * Метод для создания и получения уже существующего Payment адаптера
     * @param params - параметры для инициализации
     */
    static getInstance(...params: any[]): PaymentAdapter;
}
export interface CreatePaymentReturn extends PaymentReturn {
    redirectLink: string;
}
export interface CheckPaymentReturn extends PaymentReturn {
    paid: boolean;
}
interface PaymentReturn {
    payment: Payment;
    error?: any;
}
export {};
