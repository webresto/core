"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const _ = require("lodash");
const fs_1 = require("fs");
const buildDictionary = require('sails-build-dictionary');
class HookTools {
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
    static checkConfig(key) {
        return sails.config[key];
    }
    static waitForHooks(selfName, hooks, cb) {
        let eventsToWaitFor = ['router:after'];
        _.forEach(hooks, function (hook) {
            if (!sails.hooks[hook]) {
                throw new Error('Cannot use `' + selfName + '` hook without the `' + hook + '` hook.');
            }
            eventsToWaitFor.push('hook:' + hook + ':loaded');
        });
        sails.after(eventsToWaitFor, cb);
    }
    static bindRouter(path, action, method) {
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
    static loadPolicies(folder) {
        const normalizedPath = path.normalize(folder);
        const policies = {};
        fs_1.readdirSync(normalizedPath).forEach(function (file) {
            policies[file.split('.').slice(0, -1).join('.')] = require(normalizedPath + "/" + file);
        });
        this.policies = policies;
    }
}
exports.default = HookTools;
