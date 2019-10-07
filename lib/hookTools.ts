import * as path from "path";

const buildDictionary = require('sails-build-dictionary');
const Promise = require('bluebird');

declare const sails;
declare const _;

export default class HookTools {
  static policies: any;

  public static async bindModels(folder: string): Promise<void> {
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

  public static checkConfig(key: string): boolean {
    return sails.config[key];
  }

  public static waitForHooks(selfName: string, hooks: string[], cb: Function): void {
    let eventsToWaitFor = [];
    eventsToWaitFor.push('router:after');

    _.forEach(hooks, function (hook) {
      if (!sails.hooks[hook]) {
        throw new Error('Cannot use `' + selfName + '` hook without the `' + hook + '` hook.');
      }
      eventsToWaitFor.push('hook:' + hook + ':loaded');
    });

    sails.after(eventsToWaitFor, cb);
  }

  public static bindRouter(path: string, action: Function, method?: string): void {
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

  private static bindPolicy(path: string, action: Function): any[] {
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

  public static loadPolicies(dirname: string, folder: string) {
    const normalizedPath = require("path").join(dirname, folder);

    const policies = {};
    require("fs").readdirSync(normalizedPath).forEach(function (file) {
      policies[file.split('.').slice(0, -1).join('.')] = require(normalizedPath + "/" + file);
    });

    this.policies = policies;
  }
}
