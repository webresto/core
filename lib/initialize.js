'use strict';

const _ = require('lodash');
const path = require('path');
const buildDictionary = require('sails-build-dictionary');
const State = require('sails-hook-stateflow').State;

module.exports = function ToInitialize(sails) {
  /**
   * List of hooks that required
   */
  const requiredHooks = [
    'blueprints',
    'http',
    'orm',
    'policies',
    'views'
  ];

  return function initialize(cb) {
    /**
     * CONFIG
     */
    // If disabled. Do not load anything
    if (!sails.config.restocore) {
      return cb();
    }

    /**
     * ROUTES
     * @type {Array}
     */
    let eventsToWaitFor = [];
    eventsToWaitFor.push('router:after');
    try {
      _.forEach(requiredHooks, function (hook) {
        if (!sails.hooks[hook]) {
          throw new Error('Cannot use `restocore` hook without the `' + hook + '` hook.');
        }
        eventsToWaitFor.push('hook:' + hook + ':loaded');
      });
    } catch (err) {
      if (err) {
        return cb(err);
      }
    }

    sails.after(eventsToWaitFor, require('./afterHook')(sails));

    /**
     * MODELS
     */
    buildDictionary.optional({
      dirname: path.resolve(__dirname, '../models'),
      filter: /^([^.]+)\.(js|coffee|litcoffee)$/,
      replaceExpr: /^.*\//,
      flattenDirectories: true
    }, function (err, models) {
      if (err) {
        return cb(err);
      }
      // Get any supplemental files
      buildDictionary.optional({
        dirname: path.resolve(__dirname, '../models'),
        filter: /(.+)\.attributes.json$/,
        replaceExpr: /^.*\//,
        flattenDirectories: true
      }, function (err, supplements) {
        if (err)
          return cb(err);

        const finalModels = _.merge(models, supplements);
        sails.models = _.merge(sails.models || {}, finalModels);
      });
    });

    /**
     * Set cart states in sails-hook-stateflow
     */
    sails.stateflow = [
      new State('CART', ['CHECKOUT'], function (cb) {
        cb(null, true);
      }),
      new State('CHECKOUT', ['ORDER', 'CART'], function (cb) {
        cb(null, true);
      }),
      new State('ORDER', ['COMPLETE'], function (cb) {
        cb(null, true);
      }),
      new State('COMPLETE', [], function (cb) {
        cb(null, true);
      })
    ];

    return cb();
  }
};
