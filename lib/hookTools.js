"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const _ = require("lodash");
const fs_1 = require("fs");
const buildDictionary = require('sails-build-dictionary');
/**
 * Provide tools for hooks. Has only static methods.
 */
class HookTools {
    /**
     * Bind models from folder. Folder must be full path.
     * @param folder - path to models
     */
    static async bindModels(folder) {
        return new Promise((resolve, reject) => {
            buildDictionary.optional({
                dirname: path.resolve(__dirname, folder),
                filter: /^([^.]+)\.(js|coffee|litcoffee)$/,
                replaceExpr: /^.*\//,
                flattenDirectories: true
            }, function (err, models) {
                if (err) {
                    return reject(err);
                }
                // Get any supplemental files
                buildDictionary.optional({
                    dirname: path.resolve(__dirname, folder),
                    filter: /(.+)\.attributes.json$/,
                    replaceExpr: /^.*\//,
                    flattenDirectories: true
                }, function (err, supplements) {
                    if (err)
                        return reject(err);
                    const finalModels = _.merge(models, supplements);
                    sails.models = _.merge(sails.models || {}, finalModels);
                    return resolve();
                });
            });
        });
    }
    /**
     * Check that config with name key exists in sails.config
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
            exclude: ['locales', 'local.js', 'local.json', 'local.coffee', 'local.litcoffee'],
            excludeDirs: /(locales|env)$/,
            filter: /(.+)\.(js|json|coffee|litcoffee)$/,
            identity: false
        }, function (err, configs) {
            console.log(configs, sails.config);
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
        eventsToWaitFor.push('router:after');
        try {
            /**
             * Check hooks availability
             */
            _.forEach(hooks, function (hook) {
                if (!sails.hooks[hook]) {
                    throw new Error('Cannot use `' + selfName + '` hook without the `' + hook + '` hook.');
                }
                eventsToWaitFor.push('hook:' + hook + ':loaded');
            });
        }
        catch (err) {
            if (err) {
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
        sails.log.verbose("restocore > bindRouter: ", path);
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
    }
    static bindPolicy(path, action) {
        if (!path || !action) {
            throw 'Cannot bind undefined path to undefined action';
        }
        let result = [];
        if (this.policies && this.policies.index) {
            const info = this.policies.index;
            for (let i in info) {
                if (info.hasOwnProperty(i)) {
                    if (i === path || i === '*') {
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
     * Folder must contain index.js file that contain object with {'path/to/': policyName}, where /path/to/ is router or '*'
     * and policyName is one of others file name.
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
            policies[file.split('.').slice(0, -1).join('.')] = require(normalizedPath + "/" + file);
        });
        this.policies = policies;
    }
}
exports.default = HookTools;
