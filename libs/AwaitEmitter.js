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
    }
    /**
     * Remove event subscription
     * @param name - event name
     * @param id - subscriber ID to remove
     */
    off(name, id) {
        const _name = name.toLowerCase().replace(/[^a-z]/ig, '');
        const event = this.events.find((e) => e.name === name);
        if (event) {
            const index = event.fns.findIndex((f) => f.id === id);
            if (index !== -1) {
                event.fns.splice(index, 1); // Remove the subscriber
            }
        }
        return this;
    }
    /**
     * Event subscription
     * @param name - event name
     * @param id
     * @param fn - subscriber function
     */
    on(name, id, fn) {
        const _name = name.toLowerCase().replace(/[^a-z]/ig, '');
        let event = this.events.find((e) => e.name === _name);
        if (!event) {
            event = new Event(_name);
            this.events.push(event);
        }
        const index = event.fns.findIndex((f) => f.id === id);
        if (index !== -1) {
            event.fns[index] = { fn: fn, id: id };
        }
        else {
            event.fns.push({ fn: fn, id: id });
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
     * @return Array of Response objects
     */
    async emit(name, ...args) {
        const _name = name.toLowerCase().replace(/[^a-z]/ig, '');
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
        const executor = event.fns.map((f) => async function () {
            try {
                if (sails.config.log && sails.config.log.level === "silly") {
                    let debugRay = "ROUND: " + Math.floor(Math.random() * 1000000000) + 1 + " < " + new Date();
                    //@ts-ignore
                    args = args.map((arg) => {
                        if (typeof arg === "object") {
                            return new Proxy(arg, {
                                set: function (target, key, value) {
                                    let id = `
  -----------------------------------------------------------------
  Event: \x1b[40m\x1b[33m\x1b[5m ${name} <- ${f.id}  \x1b[0m : ${debugRay}
  \x1b[33m${key} : ${JSON.stringify(value, null, 2)} \x1b[0m
    
  method listing:
  
  ${f.fn}
  
  \x1b[32m ↷↷↷↷↷↷↷↷↷↷↷
  ${JSON.stringify(target, null, 2)}
  
  
  TRACE: 
                      `;
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
                const r = f.fn.apply(that, args);
                // If this is a promise, then we are waiting
                if (!!r && (typeof r === "object" || typeof r === "function") && typeof r.then === "function") {
                    // from isPromise
                    let timeoutEnd = false;
                    let successEnd = false;
                    // stop timer
                    const timeout = async function () {
                        await sleep(timeout);
                        if (!successEnd) {
                            timeoutEnd = true;
                            res.push(new Response(f.id, null, null, true));
                        }
                    };
                    const decorator = async function () {
                        const now = new Date();
                        try {
                            const res1 = await r;
                            if (!timeoutEnd) {
                                successEnd = true;
                                res.push(new Response(f.id, res1));
                            }
                            else {
                                const listenerName = f.id || "some";
                                sails.log.error(listenerName, "event of action", name, "in", that.name, "emitter end after", new Date().getTime() - now.getTime(), "ms");
                            }
                        }
                        catch (e) {
                            successEnd = true;
                            res.push(new Response(f.id, null, e));
                        }
                    };
                    await Promise.race([timeout(), decorator()]);
                    // If the function is not a promise, then execute it immediately
                }
                else {
                    try {
                        res.push(new Response(f.id, r));
                    }
                    catch (e) {
                        res.push(new Response(f.id, null, e));
                    }
                }
            }
            catch (e) {
                res.push(new Response(f.id, null, e));
            }
        });
        await Promise.all(executor.map((f) => f()));
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
        this.fns = [];
    }
}
/**
 * Response object, contains a mark where the listener came from, the state of the result (success, error, timeout), and the result or
 * error returned or called by the function
 */
class Response {
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
