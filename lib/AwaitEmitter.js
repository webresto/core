"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var isPromise = require('is-promise');
var sleep = require('util').promisify(setTimeout);
var AwaitEmitter = (function () {
    function AwaitEmitter(name, timeout) {
        this.name = name;
        this.timeout = timeout || 1000;
        this.events = [];
    }
    AwaitEmitter.prototype.on = function (name, label, fn) {
        if (typeof label === 'function') {
            fn = label;
            label = '';
        }
        var event = this.events.filter(function (l) { return l.name === name; })[0];
        if (!event) {
            event = new Event(name);
            this.events.push(event);
        }
        event.fns.push({
            fn: fn,
            label: label
        });
        return this;
    };
    AwaitEmitter.prototype.emit = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var that, event, res, executor;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        that = this;
                        event = this.events.find(function (l) { return l.name === name; });
                        if (!event)
                            return [2, []];
                        res = [];
                        executor = event.fns.map(function (f) { return function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var r_1, timeoutEnd_1, successEnd_1, timeout, decorator, e_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 4, , 5]);
                                            r_1 = f.fn.apply(that, args);
                                            if (!isPromise(r_1)) return [3, 2];
                                            timeoutEnd_1 = false;
                                            successEnd_1 = false;
                                            timeout = function () {
                                                return __awaiter(this, void 0, void 0, function () {
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: return [4, sleep(that.timeout)];
                                                            case 1:
                                                                _a.sent();
                                                                if (!successEnd_1) {
                                                                    timeoutEnd_1 = true;
                                                                    res.push(new Response(f.label, null, null, true));
                                                                }
                                                                return [2];
                                                        }
                                                    });
                                                });
                                            };
                                            decorator = function () {
                                                return __awaiter(this, void 0, void 0, function () {
                                                    var now, res1, listenerName, e_2;
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0:
                                                                now = new Date();
                                                                _a.label = 1;
                                                            case 1:
                                                                _a.trys.push([1, 3, , 4]);
                                                                return [4, r_1];
                                                            case 2:
                                                                res1 = _a.sent();
                                                                if (!timeoutEnd_1) {
                                                                    successEnd_1 = true;
                                                                    res.push(new Response(f.label, res1));
                                                                }
                                                                else {
                                                                    listenerName = f.label || 'some';
                                                                    sails.log.warn(listenerName, 'event of action', name, 'in', that.name, 'emitter end after', new Date().getTime() - now.getTime(), 'ms');
                                                                }
                                                                return [3, 4];
                                                            case 3:
                                                                e_2 = _a.sent();
                                                                successEnd_1 = true;
                                                                res.push(new Response(f.label, null, e_2));
                                                                return [3, 4];
                                                            case 4: return [2];
                                                        }
                                                    });
                                                });
                                            };
                                            return [4, Promise.race([timeout(), decorator()])];
                                        case 1:
                                            _a.sent();
                                            return [3, 3];
                                        case 2:
                                            res.push(new Response(f.label, r_1));
                                            _a.label = 3;
                                        case 3: return [3, 5];
                                        case 4:
                                            e_1 = _a.sent();
                                            res.push(new Response(f.label, null, e_1));
                                            return [3, 5];
                                        case 5: return [2];
                                    }
                                });
                            });
                        }; });
                        return [4, Promise.all(executor.map(function (f) { return f(); }))];
                    case 1:
                        _a.sent();
                        return [2, res];
                }
            });
        });
    };
    return AwaitEmitter;
}());
exports["default"] = AwaitEmitter;
var Event = (function () {
    function Event(name) {
        this.name = name;
        this.fns = [];
    }
    return Event;
}());
var Response = (function () {
    function Response(label, result, error, timeout) {
        this.label = label;
        this.result = result;
        this.error = error;
        this.state = timeout ? 'timeout' : this.error ? 'error' : 'success';
    }
    return Response;
}());
