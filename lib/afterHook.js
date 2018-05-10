'use strict';

const controller = require('../controller/controller');
const iikoApi = require('./iiko-api');

module.exports = function (sails, cb) {
  return function afterHooksLoaded() {
    /**
     * ROUTES
     */
    const baseRoute = "/api/0.5/";

    sails.router.bind(baseRoute + ':method', controller);

    /**
     * SYNC
     */
    iikoApi.init(sails.config.webcore.iiko);
    require('./sync')();
  }
};
