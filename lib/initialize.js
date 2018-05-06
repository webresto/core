'use strict';

const _ = require('lodash');
const fs = require('fs');

module.exports = function ToInitialize(sails) {

    /**
     * List of hooks that required
     */
    const requiredHooks = [
        'blueprints',
        'controllers',
        'http',
        'orm',
        'policies',
        'views'
    ];

    return function initialize(cb) {
        // If disabled. Do not load anything
        if (!sails.config.webcore) {
            return cb();
        }

        let eventsToWaitFor = [];
        eventsToWaitFor.push('router:after');
        try {
            _.forEach(requiredHooks, function (hook) {
                if (!sails.hooks[hook]) {
                    throw new Error('Cannot use `webcore` hook without the `' + hook + '` hook.');
                }
                eventsToWaitFor.push('hook:' + hook + ':loaded');
            });
        } catch(err) {
            if (err) {
                return cb(err);
            }
        }

        sails.after(eventsToWaitFor, require('../lib/routes')(sails));
    }
};
