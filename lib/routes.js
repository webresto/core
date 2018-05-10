'use strict';

const controllerApi = require('./controllerApi');

module.exports = function bindRoutes(sails) {
    return function afterHooksLoaded() {
        const baseRoute = "/api/0.5/";

        sails.router.bind(baseRoute + ':method', controllerApi);
    }
};
