import OrderResponse from "./OrderResponse";
import Cart from "../../models/Cart";
/**
 * Абстрактный класс RMS адаптера. Используется для создания новых адаптеров RMS.
 */
export default abstract class RMSAdapter {
    protected readonly syncMenuTime: number;
    protected readonly syncBalanceTime: number;
    protected readonly syncStreetsTime: number;
    protected constructor(menuTime: number, balanceTime: number, streetsTime: number);
    /**
     * Синхронизация данных с RMS системы
     */
    protected abstract sync(): Promise<void>;
    /**
     * Синхронизация улиц с RMS системы
     */
    protected abstract syncStreets(): Promise<void>;
    /**
     * Синхронизация баланса блюд с RMS адаптера
     */
    protected abstract syncBalance(): Promise<void>;
    /**
     * Создание заказа
     * @param orderData - корзина, которую заказывают
     * @return Результат работы функции, тело ответа и код результата
     */
    abstract createOrder(orderData: Cart): Promise<OrderResponse>;
    /**
     * Проверка заказа
     * @param orderData - корзина для проверки
     * @return результат работы функции, тело ответа и код результата
     */
    abstract checkOrder(orderData: Cart): Promise<OrderResponse>;
    /**
     * Получение системной информации
     * @return системная информация RMS
     */
    abstract getSystemData(): Promise<any>;
    /**
     * Прямой запрос к API RMS
     * @param method - к какому методу обращаться
     * @param params - какие параметры передавать
     * @return ответ API
     */
    abstract api(method: string, params: any): Promise<any>;
    /**
     * Метод для создания и получения уже существующего RMS адаптера
     * @param params - параметры для инициализации
     */
    static getInstance(...params: any[]): RMSAdapter;
}
