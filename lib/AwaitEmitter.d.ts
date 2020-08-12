declare type func = (...args: any) => any | Promise<any>;
export default class AwaitEmitter {
    events: Event[];
    name: string;
    timeout: number;
    constructor(name: string, timeout?: number);
    on(name: string, fn: func): AwaitEmitter;
    on(name: string, label: string, fn: func): AwaitEmitter;
    emit(name: string, ...args: any): Promise<Response[]>;
}
declare class Event {
    name: string;
    fns: {
        fn: func;
        label: string;
    }[];
    constructor(name: string);
}
declare class Response {
    label: string;
    state: 'success' | 'error' | 'timeout';
    result: any;
    error: any;
    constructor(label: string, result: any, error?: any, timeout?: boolean);
}
export {};
