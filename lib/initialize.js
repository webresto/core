'use strict';

const State = require('sails-hook-stateflow').State;
const hookTools = require('./hookTools').default;

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
    if (!hookTools.checkConfig('restocore')) {
      return cb();
    }

    /**
     * AFTER OTHERS HOOKS
     */
    hookTools.waitForHooks('restocore', requiredHooks, require('@webresto/core/lib/afterHook').default(sails));

    /**
     * Set cart states in sails-hook-stateflow
     */
    sails.stateflow = [
      new State('CART', ['CHECKOUT'], function (cb) {
        cb(null, true);
      }),
      new State('CHECKOUT', ['COMPLETE', 'CART'], function (cb) {
        cb(null, true);
      }),
      new State('COMPLETE', [], function (cb) {
        cb(null, true);
      })
    ];

    /**
     * MODELS
     */
    hookTools.bindModels('../models').then(() => {
      return cb();
    });
  }
};
