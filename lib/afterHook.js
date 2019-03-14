const moment = require('moment-timezone');

const controllerApi = require('../controller/controllerApi');
const controllerMenu = require('../controller/controllerMenu');
const controllerCart = require('../controller/controllerCart');
const controllerImages = require('../controller/controllerImages');
const controllerOrder = require('../controller/controllerOrder');
const controllerNomenclature = require('../controller/controllerStoplist');
const controllerStreets = require('../controller/controllerStreets');
const controllerSystem = require('../controller/controllerSystem');
const controllerCheck = require('../controller/controllerCheck');
const controllerGroup = require('../controller/controllerGroup');
const controllerGetDeliveries = require('../controller/controllerGetDeliveries');
const controllerCustomCheck = require('../controller/controllerCustomCheck');

module.exports = function (sails) {
  return function afterHooksLoaded() {
    /**
     * ROUTES
     */
    const baseRoute = "/api/0.5/";

    sails.router.bind(baseRoute + 'api/:method', controllerApi);
    sails.router.bind(baseRoute + 'cart/add', controllerCart.add);
    sails.router.bind(baseRoute + 'cart/remove', controllerCart.remove);
    sails.router.bind(baseRoute + 'cart/set', controllerCart.set);
    sails.router.bind(baseRoute + 'cart/setcomment', controllerCart.setComment);
    sails.router.bind(baseRoute + 'cart', controllerCart.get);
    sails.router.bind(baseRoute + 'images', controllerImages);
    sails.router.bind(baseRoute + 'menu', controllerMenu);
    sails.router.bind(baseRoute + 'stoplist', controllerNomenclature);
    sails.router.bind(baseRoute + 'order', controllerOrder);
    sails.router.bind(baseRoute + 'streets', controllerStreets);
    sails.router.bind(baseRoute + 'system', controllerSystem);
    sails.router.bind(baseRoute + 'groups', controllerGroup);
    sails.router.bind(baseRoute + 'delivery', controllerGetDeliveries);
    if (sails.config.restocore.checkType === 'rms') {
      sails.router.bind(baseRoute + 'check', controllerCheck);
    } else {
      sails.router.bind(baseRoute + 'check', controllerCustomCheck);
    }


    /**
     * SYNC
     */
    require('./sync')();

    /**
     * EMAIL
     */
    require('./email');

    if (sails.config.restocore.timezone)
      moment.tz.setDefault(sails.config.restocore.timezone);
  }
};
