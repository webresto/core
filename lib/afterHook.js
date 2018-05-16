'use strict';

const controllerApi = require('../controller/controllerApi');
const controllerMenu = require('../controller/controllerMenu');
const controllerCart = require('../controller/controllerCart');
const controllerImages = require('../controller/controllerImages');
const controllerOrder = require('../controller/controllerOrder');
const controllerNomenclature = require('../controller/controllerNomenclature');
const iikoApi = require('./iiko-api');

module.exports = function (sails, cb) {
  return function afterHooksLoaded() {
    /**
     * ROUTES
     */
    const baseRoute = "/api/0.5/";

    sails.router.bind(baseRoute + 'api/:method', controllerApi);
    sails.router.bind(baseRoute + 'cart', controllerCart);
    sails.router.bind(baseRoute + 'images', controllerImages);
    sails.router.bind(baseRoute + 'menu', controllerMenu);
    sails.router.bind(baseRoute + 'nomenclature', controllerNomenclature);
    sails.router.bind(baseRoute + 'order', controllerOrder);

    /**
     * SYNC
     */
    iikoApi.init(sails.config.webcore.iiko);
    require('./sync')();
  }
};
