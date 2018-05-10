'use strict';

const _ = require('lodash');
const iikoApi = require('./iiko-api');

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
        // If disabled. Do not load anything

        /**
         * CONFIG
         */
        if (!sails.config.webcore) {
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
                    throw new Error('Cannot use `webcore` hook without the `' + hook + '` hook.');
                }
                eventsToWaitFor.push('hook:' + hook + ':loaded');
            });
        } catch (err) {
            if (err) {
                return cb(err);
            }
        }

        sails.after(eventsToWaitFor, require('../lib/afterHook')(sails));


        /**
         * SYNC
         */
        iikoApi.init(sails.config.webcore.iiko);
        require('./sync')();

        return cb();
    }
};
