declare type func = (...args: any) => any | Promise<any>;
/**
 * Класс, позволяющий создавать события и ожидать исполнения их подписок, будь то синхронная функция или функция, возвращающая
 * Promise. В момент выполнения события запускает все подписки на исполнение, запоминая результат работы каждой (успешный,
 * с ошибкой или время ожидания вышло).
 */
export default class AwaitEmitter {
    events: Event[];
    name: string;
    timeout: number;
    /**
     * @param name - название нового эмиттера
     * @param timeout - указывает сколько милисекунд ожидать функции, которые возвращают Promise.
     */
    constructor(name: string, timeout?: number);
    /**
     * Подписка на событие
     * @param name - название события
     * @param fn - функция подписчик
     */
    on(name: string, fn: func): AwaitEmitter;
    /**
     * Подписка на событие
     * @param name - название события
     * @param label - метка подписчика (используется для отладки)
     * @param fn - функция подписчика
     */
    on(name: string, label: string, fn: func): AwaitEmitter;
    /**
     * Эмиттит событие с названием name иаргументами args. Если функция подписчик отдаёт не Promise, то она считается синхронной
     * и выполняется сразу же, если же функция слушатель возвращает Promise, то она вместе с остальными такими же слушателями
     * выполняется параллельно, при этом может быть превышено время ожидание. Если слушатель при этом выполнится после
     * превышения времени ожидания, то будет выведенно соответствующее сообщение
     * @param name - название события
     * @param args - аргументы
     * @return Массив объектов Response
     */
    emit(name: string, ...args: any): Promise<Response[]>;
}
/**
 * Объект собятия, хранит название события и его слушателей
 */
declare class Event {
    name: string;
    fns: {
        fn: func;
        label: string;
    }[];
    constructor(name: string);
}
/**
 * Объект ответа, содержит пометку откуда был слушатель, состояние результат (успех, ошибка, таймаут) и результат или
 * ошибку, которые вернула или вызвала функция
 */
declare class Response {
    label: string;
    state: 'success' | 'error' | 'timeout';
    result: any;
    error: any;
    constructor(label: string, result: any, error?: any, timeout?: boolean);
}
export {};
