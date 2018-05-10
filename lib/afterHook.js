'use strict';

const path = require('path');
const buildDictionary = require('sails-build-dictionary');

const controllerApi = require('./controllerApi');

module.exports = function (sails, cb) {
    return function afterHooksLoaded() {
        /**
         * ROUTES
         */
        const baseRoute = "/api/0.5/";

        sails.router.bind(baseRoute + ':method', controllerApi);

        /**
         * MODELS
         */
        buildDictionary.optional({
            dirname: path.resolve(__dirname, '../api/models'),
            filter: /^([^.]+)\.(js|coffee|litcoffee)$/,
            replaceExpr: /^.*\//,
            flattenDirectories: true
        }, function (err, models) {
            if (err) {
                return cb(err);
            }
            // Get any supplemental files
            buildDictionary.optional({
                dirname: path.resolve(__dirname, '../api/models'),
                filter: /(.+)\.attributes.json$/,
                replaceExpr: /^.*\//,
                flattenDirectories: true
            }, function (err, supplements) {
                if (err)
                    return cb(err);

                const finalModels = sails.util.merge(models, supplements);
                sails.models = sails.util.merge(sails.models || {}, finalModels);
            });
        });
    }
};
