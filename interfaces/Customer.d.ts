import { Phone } from "../models/User";
/**
 * Описывает данные о заказчике для доставки
 */
export default interface Customer {
    phone: Phone;
    mail?: string;
    name: string;
}
