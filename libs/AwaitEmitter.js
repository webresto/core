"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sleep = require("util").promisify(setTimeout);
/**
 * A class that allows you to create events and wait for the execution of their subscriptions, whether it is a synchronous function or a function that returns
 * Promise.At the moment of execution of the event, it starts all execution subscriptions, remembering the result of each (successful,
 * with an error or timed out).
 */
class AwaitEmitter {
    /**
     * @param name - name of the new emitter
     * @param timeout - specifies how many milliseconds to wait for functions that return a Promise.
     */
    constructor(name, timeout) {
        this.name = name;
        this.timeout = timeout || 1000;
        this.events = [];
        this.declarations = [];
    }
    /**
   * Declare event
   * Declarations are needed so that we can get a list of system events
   * @param name - event name
   * @param id - subscriber ID to remove
   */
    declare(name, description = "unknown event") {
        const index = this.declarations.findIndex((_declaration) => _declaration.name === name);
        if (index !== -1) {
            this.declarations.splice(index, 1);
        }
        this.declarations.push({ name, description });
    }
    /**
     * Issues one declaration per event
     * @param name event name
     * @returns
     */
    getDeclaration(name) {
        return this.declarations.find((_declaration) => _declaration.name === name);
    }
    /**
     *Issuer of all declarations
     * @returns
     */
    getDeclarations() {
        return this.declarations;
    }
    /**
     * Remove event subscription
     * @param name - event name
     * @param id - subscriber ID to remove
     */
    off(name, id) {
        const _name = name.toLowerCase().replace(/[^a-z]/ig, '-');
        const event = this.events.find((e) => e.name === name);
        if (event) {
            const index = event.subscribers.findIndex((subscriber) => subscriber.id === id);
            if (index !== -1) {
                event.subscribers.splice(index, 1); // Remove the subscriber
            }
        }
        return this;
    }
    /**
     * Event subscription
     * @param name - event name
     * @param id - subscriber id
     * @param handler - handler function
     */
    on(name, id, handler) {
        const _name = name.toLowerCase().replace(/[^a-z]/ig, '-');
        let event = this.events.find((e) => e.name === _name);
        if (!event) {
            event = new Event(_name);
            this.events.push(event);
        }
        const index = event.subscribers.findIndex((subscriber) => subscriber.id === id);
        if (index !== -1) {
            event.subscribers[index] = { handler: handler, id: id };
        }
        else {
            event.subscribers.push({ handler: handler, id: id });
        }
        return this;
    }
    /**
     * Emits an event with name and args.If the subscriber function does not return a Promise, then it is considered synchronous
     * and is executed immediately, if the listener function returns a Promise, then it, along with the rest of the same listeners
     * runs in parallel and may time out.If the listener is then executed after
     * timeout, an appropriate message will be displayed
     * @param name - event name
     * @param args - arguments
     * @return Array of HandlerResponse objects
     */
    async emit(name, ...args) {
        if (!this.getDeclaration(name)) {
            sails.log.warn(`There are no declarations for event [${name}].\nPlease add a declaration using the (emitter.declare) method`);
            this.declare(name);
        }
        const _name = name.toLowerCase().replace(/[^a-z]/ig, '-');
        const that = this;
        const event = this.events.find((l) => l.name === _name);
        if (!event)
            return [];
        let timeout;
        if (typeof args[args.length - 1] === "number") {
            timeout = args[args.length - 1];
        }
        else {
            timeout = that.timeout;
            args.push(timeout);
        }
        const res = [];
        const executor = event.subscribers.map((subscriber) => async function () {
            try {
                if (sails.config.log && sails.config.log.level === "silly" && process.env.AWAIT_EMITTER_SILLY) {
                    let debugRay = "ROUND: " + Math.floor(Math.random() * 1000000000) + 1 + " < " + new Date();
                    //@ts-ignore
                    args = args.map((arg) => {
                        if (typeof arg === "object") {
                            return new Proxy(arg, {
                                set: function (target, key, value) {
                                    let id = formatTrace(name, subscriber, debugRay, key, value, target);
                                    console.trace(id);
                                    target[key] = value;
                                    return true;
                                },
                            });
                        }
                        else {
                            return arg;
                        }
                    });
                } //silly
                const handlerResult = subscriber.handler.apply(that, args);
                // If this is a promise, then we are waiting
                if (!!handlerResult && (typeof handlerResult === "object" || typeof handlerResult === "function") && typeof handlerResult.then === "function") {
                    // from isPromise
                    let timeoutEnd = false;
                    let successEnd = false;
                    // stop timer
                    const timeout = async function () {
                        await sleep(timeout);
                        if (!successEnd) {
                            timeoutEnd = true;
                            res.push(new HandlerResponse(subscriber.id, null, null, true));
                        }
                    };
                    const decorator = async function () {
                        const now = new Date();
                        try {
                            const result = await handlerResult;
                            if (!timeoutEnd) {
                                successEnd = true;
                                res.push(new HandlerResponse(subscriber.id, result));
                            }
                            else {
                                const listenerName = subscriber.id;
                                sails.log.silly(`[${listenerName}] event of action [${name}] in [${that.name}] emitter end after [${new Date().getTime() - now.getTime()}] ms`);
                            }
                        }
                        catch (e) {
                            successEnd = true;
                            res.push(new HandlerResponse(subscriber.id, null, e));
                        }
                    };
                    await Promise.race([timeout(), decorator()]);
                    // If the function is not a promise, then execute it immediately
                }
                else {
                    try {
                        res.push(new HandlerResponse(subscriber.id, handlerResult));
                    }
                    catch (e) {
                        res.push(new HandlerResponse(subscriber.id, null, e));
                    }
                }
            }
            catch (e) {
                res.push(new HandlerResponse(subscriber.id, null, e));
            }
        });
        await Promise.all(executor.map((subscriber) => subscriber()));
        return res;
    }
}
exports.default = AwaitEmitter;
/**
 * Event object, stores the name of the event and its listeners
 */
class Event {
    constructor(name) {
        this.name = name;
        this.subscribers = [];
    }
}
/**
 * HandlerResponse object, contains a mark where the listener came from, the state of the result (success, error, timeout), and the result or
 * error returned or called by the function
 */
class HandlerResponse {
    constructor(id, result, error, timeout) {
        this.id = id;
        this.result = result;
        this.error = error;
        this.state = timeout ? "timeout" : this.error ? "error" : "success";
        if (error) {
            sails.log.error(`Emitter with id [${id ?? 'some'}], was finished with error:`, error);
        }
    }
}
function formatTrace(name, subscriber, debugRay, key, value, target) {
    return `
-----------------------------------------------------------------
Event: \x1b[40m\x1b[33m\x1b[5m ${name} <- ${subscriber.id}  \x1b[0m : ${debugRay}
\x1b[33m${key} : ${JSON.stringify(value, null, 2)} \x1b[0m
  
method listing:

${subscriber.handler}

\x1b[32m ↷↷↷↷↷↷↷↷↷↷↷
${JSON.stringify(target, null, 2)}


TRACE: 
                    `;
}
