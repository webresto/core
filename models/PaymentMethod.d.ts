import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import PaymentAdapter from "../adapters/payment/PaymentAdapter";
declare enum PaymentMethodType {
    "promise" = 0,
    "external" = 1,
    "internal" = 2,
    "dummy" = 3
}
declare let attributes: {
    /** ID платежного метода */
    id: string;
    /** Название платежного метода */
    title: string;
    /**
     * Типы платежей, internal - внутренние (когда не требуется запрос во внешнюю систему)
     * external - Когда надо ожидать подтверждение платежа во внешней системе
     * promise - Типы оплат при получении
     */
    type: PaymentMethodType;
    adapter: string;
    order: number;
    description: string;
    enable: boolean;
};
declare type attributes = typeof attributes;
interface PaymentMethod extends attributes, ORM {
}
export default PaymentMethod;
declare let Model: {
    /**
     * Возвращает инстанс платежного адаптера по известному названию адаптера
     * @param  paymentMethodId
     * @return
     */
    getAdapter(adapter?: string): any;
    beforeCreate: (paymentMethod: any, next: any) => void;
    /**
     * Возвращает true если платежный метод является обещанием платежа
     * @param  paymentMethodId
     * @return
     */
    isPaymentPromise(paymentMethodId?: string): any;
    /**
     * Добавляет в список возможных к использованию платежные адаптеры при их старте.
     * Если  платежный метод не сушетсвует в базе то создает его
     * @param paymentMethod
     * @return
     */
    alive(paymentAdapter: PaymentAdapter): any;
    /**
     * Возвращает массив с возможными на текущий момент способами оплаты отсортированный по order
     * @param  нету
     * @return массив типов оплат
     */
    getAvailable(): any;
    /**
     * Проверяет платежную систему на доступность, и включенность,
     *  для пейментПромис систем только включенность.
     * @param paymentMethodId
     * @return
     */
    checkAvailable(paymentMethodId: string): any;
    /**
     * Возвращает инстанс платежного адаптера по известному ID PaymentMethod
     * @param  paymentMethodId
     * @return PaymentAdapter
     * @throws
     */
    getAdapterById(paymentMethodId: string): any;
};
declare global {
    const PaymentMethod: typeof Model & ORMModel<PaymentMethod>;
}
