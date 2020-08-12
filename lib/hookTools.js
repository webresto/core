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
var path = require("path");
var _ = require("lodash");
var fs_1 = require("fs");
var buildDictionary = require('sails-build-dictionary');
var HookTools = (function () {
    function HookTools() {
    }
    HookTools.bindModels = function (folder) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, new Promise(function (resolve, reject) {
                        buildDictionary.optional({
                            dirname: path.resolve(__dirname, folder),
                            filter: /^([^.]+)\.(js|coffee|litcoffee)$/,
                            replaceExpr: /^.*\//,
                            flattenDirectories: true
                        }, function (err, models) {
                            if (err) {
                                return reject(err);
                            }
                            buildDictionary.optional({
                                dirname: path.resolve(__dirname, folder),
                                filter: /(.+)\.attributes.json$/,
                                replaceExpr: /^.*\//,
                                flattenDirectories: true
                            }, function (err, supplements) {
                                if (err)
                                    return reject(err);
                                var finalModels = _.merge(models, supplements);
                                sails.models = _.merge(sails.models || {}, finalModels);
                                return resolve();
                            });
                        });
                    })];
            });
        });
    };
    HookTools.checkConfig = function (key) {
        return sails.config[key];
    };
    HookTools.waitForHooks = function (selfName, hooks, cb) {
        var eventsToWaitFor = ['router:after'];
        _.forEach(hooks, function (hook) {
            if (!sails.hooks[hook]) {
                throw new Error('Cannot use `' + selfName + '` hook without the `' + hook + '` hook.');
            }
            eventsToWaitFor.push('hook:' + hook + ':loaded');
        });
        sails.after(eventsToWaitFor, cb);
    };
    HookTools.bindRouter = function (path, action, method) {
        if (!path || !action) {
            throw 'Cannot bind undefined path to undefined action';
        }
        if (!_.isString(path)) {
            throw 'path must be string, not ' + typeof path;
        }
        if (!_.isFunction(action)) {
            sails.log.error(action);
            throw 'action must be function, not ' + typeof action;
        }
        if (method) {
            if (!_.isString(method)) {
                throw 'method must be string, not ' + typeof method;
            }
        }
        sails.router.bind(path, this.bindPolicy(path, action), method);
    };
    HookTools.bindPolicy = function (path, action) {
        if (!path || !action) {
            throw 'Cannot bind undefined path to undefined action';
        }
        var result = [];
        if (this.policies && this.policies.index) {
            var info = this.policies.index;
            for (var i in info) {
                if (info.hasOwnProperty(i)) {
                    if (i === path || i === '*') {
                        if (!_.isArray(info[i])) {
                            info[i] = [info[i]];
                        }
                        for (var j in info[i]) {
                            if (info[i].hasOwnProperty(j)) {
                                result.push(this.policies[info[i][j]]);
                            }
                        }
                    }
                }
            }
        }
        result.push(action);
        return result;
    };
    HookTools.loadPolicies = function (folder) {
        var normalizedPath = path.normalize(folder);
        var policies = {};
        fs_1.readdirSync(normalizedPath).forEach(function (file) {
            policies[file.split('.').slice(0, -1).join('.')] = require(normalizedPath + "/" + file);
        });
        this.policies = policies;
    };
    return HookTools;
}());
exports["default"] = HookTools;
