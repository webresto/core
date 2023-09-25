type func = (...args: any) => any | Promise<any>;
/**
 * A class that allows you to create events and wait for the execution of their subscriptions, whether it is a synchronous function or a function that returns
 * Promise.At the moment of execution of the event, it starts all execution subscriptions, remembering the result of each (successful,
 * with an error or timed out).
 */
export default class AwaitEmitter {
    events: Event[];
    name: string;
    timeout: number;
    /**
     * @param name - name of the new emitter
     * @param timeout - specifies how many milliseconds to wait for functions that return a Promise.
     */
    constructor(name: string, timeout?: number);
    /**
     * Event subscription
     * @param name - event name
     * @param fn - subscriber function
     */
    on(name: string, fn: func): AwaitEmitter;
    /**
     * Подписка на событие
     * @param name - event name
     * @param label - subscriber label (used for debugging)
     * @param fn - subscriber function
     */
    on(name: string, label: string, fn: func): AwaitEmitter;
    /**
      * Emits an event with name name and args.If the subscriber function does not return a Promise, then it is considered synchronous
     * and is executed immediately, if the listener function returns a Promise, then it, along with the rest of the same listeners
     * runs in parallel and may time out.If the listener is then executed after
     * timeout, an appropriate message will be displayed
     * @param name - event name
     * @param args - arguments
     * @return Array of Response objects
     */
    emit(name: string, ...args: any): Promise<Response[]>;
}
/**
 * Event object, stores the name of the event and its listeners
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
 * Response object, contains a mark where the listener came from, the state of the result (success, error, timeout) and the result or
 * error returned or called by the function
 */
declare class Response {
    label: string;
    state: "success" | "error" | "timeout";
    result: any;
    error: any;
    constructor(label: string, result: any, error?: any, timeout?: boolean);
}
export {};
