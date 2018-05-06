'use strict';

module.exports = function bindRoutes(sails) {
    return function afterHooksLoaded() {
        const baseRoute = "/api/0.5/";

        sails.router.bind(baseRoute, controller);
    }
};
