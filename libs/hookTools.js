"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const _ = __importStar(require("lodash"));
const fs_1 = require("fs");
const buildDictionary = require("sails-build-dictionary");
/**
 * Provide tools for hooks. Has only static methods.
 */
class HookTools {
    /**
     * Bind models from folder. Folder must be full path.
     * @param folder - path to models
     * @param modelsToSkip - list of models that needed to be skipped
     */
    static async bindModels(folder, modelsToSkip) {
        return new Promise((resolve, reject) => {
            buildDictionary.optional({
                dirname: path.resolve(__dirname, folder),
                filter: /^([^.]+)\.(js)$/,
                replaceExpr: /^.*\//,
                flattenDirectories: true,
            }, function (err, models) {
                if (err)
                    return reject(new Error(err));
                // skip models declared in modelsToSkip
                if (modelsToSkip && modelsToSkip.length) {
                    for (const modelToSkip of modelsToSkip) {
                        delete models[modelToSkip];
                    }
                }
                sails.models = _.merge(sails.models || {}, models);
                return resolve();
            });
        });
    }
    /**
     * Check that config with a name key exists in sails.config
     * @param key - name of config to check
     * @return true if config exists
     */
    static checkConfig(key) {
        return sails.config[key];
    }
    /**
     * Bind config from folder. Folder must be full path.
     * @param folder - path to models
     */
    static async bindConfig(folder) {
        buildDictionary.aggregate({
            dirname: path.resolve(__dirname, folder),
            exclude: ["locales", "local.js", "local.json", "local.coffee", "local.litcoffee"],
            excludeDirs: /(locales|env)$/,
            filter: /(.+)\.(js|json|coffee|litcoffee)$/,
            identity: false,
        }, function (err, configs) {
            //@ts-ignore
            sails.config = sails.util.merge(configs, sails.config);
        });
    }
    /**
     * Start cb function after given names of hooks. Call error with selfName if one of hooks not found
     * @param selfName - name of hook. Uses for debugging
     * @param hooks - array of names hooks to wait for
     * @param cb - function
     */
    static waitForHooks(selfName, hooks, cb) {
        var eventsToWaitFor = [];
        eventsToWaitFor.push("router:after");
        try {
            /**
             * Check hooks availability
             */
            _.forEach(hooks, function (hook) {
                if (!sails.hooks[hook]) {
                    throw new Error("Cannot use `" + selfName + "` hook without the `" + hook + "` hook.");
                }
                eventsToWaitFor.push("hook:" + hook + ":loaded");
            });
        }
        catch (err) {
            if (err) {
                sails.log.error(err);
                return cb(err);
            }
        }
        sails.after(eventsToWaitFor, cb);
    }
    /**
     * Bind function `action` to router `path` with method `method`. Use policies binding from this module.
     * @param path - /path/to/bind
     * @param action - function with Action type
     * @param method - GET or POST ot etc.
     */
    static bindRouter(path, action, method) {
        sails.log.silly("restocore > bindRouter: ", path);
        if (!path || !action) {
            throw "Cannot bind undefined path to undefined action";
        }
        if (!_.isString(path)) {
            throw "path must be string, not " + typeof path;
        }
        if (!_.isFunction(action)) {
            sails.log.error(action);
            throw "action must be function, not " + typeof action;
        }
        if (method) {
            if (!_.isString(method)) {
                throw "method must be string, not " + typeof method;
            }
        }
        sails.router.bind(path, this.bindPolicy(path, action), method);
    }
    static bindPolicy(path, action) {
        if (!path || !action) {
            throw "Cannot bind undefined path to undefined action";
        }
        let result = [];
        if (this.policies && this.policies.index) {
            const info = this.policies.index;
            for (let i in info) {
                if (info.hasOwnProperty(i)) {
                    if (i === path || i === "*") {
                        if (!_.isArray(info[i])) {
                            info[i] = [info[i]];
                        }
                        for (let j in info[i]) {
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
    }
    /**
     * Load policies from given folder.
     * The folder must contain index.js file that contains object with {'path/to/': policyName}, where /path/to/ is router or '*'
     * and policyName is one of other file names.
     * For example
     * |
     * * - index.js > module.exports = {
     * |                '/index': 'policy'
     * |              }
     * |
     * * - policy.js > module.exports = function (req, res, next) {
     *                    return next();
     *                 }
     * @param folder - folder where policies load
     */
    // TODO: Проблема в том что система полиси совсем не предназначена для хуков, нельзя сделать хук который будет добавлять чтото в полиси, можно сделать только полностью замеяющий хук сейчас
    static loadPolicies(folder) {
        const normalizedPath = path.normalize(folder);
        const policies = {};
        (0, fs_1.readdirSync)(normalizedPath).forEach(function (file) {
            //@ts-ignore
            policies[file.split(".").slice(0, -1).join(".")] = require(normalizedPath + "/" + file);
        });
        this.policies = policies;
    }
}
exports.default = HookTools;
