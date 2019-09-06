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
const controllerGetDeliveries = require('../controller/controllerGetDeliveries');
const controllerCustomCheck = require('../controller/controllerCustomCheck');

const conf = sails.config.restocore;
const RMS = require('../adapter/index').RMS.getAdapter(conf.rmsAdapter);

module.exports = function (sails) {
  return async function afterHooksLoaded() {
    /**
     * RMS
     */
    RMS.getInstance(conf[conf.rmsAdapter], conf.images, conf.timeSyncMenu, conf.timeSyncBalance, conf.timeSyncStreets);

    /**
     * POLICIES
     */
    loadPolicies();

    /**
     *  ROUTES
     */
    const baseRoute = "/api/0.5/";

    bindRouter(baseRoute + 'api/:method', controllerApi);
    bindRouter(baseRoute + 'cart/add', controllerCart.add);
    bindRouter(baseRoute + 'cart/remove', controllerCart.remove);
    bindRouter(baseRoute + 'cart/set', controllerCart.set);
    bindRouter(baseRoute + 'cart/setcomment', controllerCart.setComment);
    bindRouter(baseRoute + 'cart', controllerCart.get);
    bindRouter(baseRoute + 'images', controllerImages);
    bindRouter(baseRoute + 'menu', controllerMenu);
    bindRouter(baseRoute + 'stoplist', controllerNomenclature);
    bindRouter(baseRoute + 'order', controllerOrder);
    bindRouter(baseRoute + 'streets', controllerStreets);
    bindRouter(baseRoute + 'system', controllerSystem);
    bindRouter(baseRoute + 'delivery', controllerGetDeliveries);
    if (sails.config.restocore.checkType === 'rms') {
      sails.router.bind(baseRoute + 'check', controllerCheck);
    } else {
      sails.router.bind(baseRoute + 'check', controllerCustomCheck, 'post');
    }

    /**
     * EMAIL
     */
    require('./email');

    if (conf.timezone)
      moment.tz.setDefault(conf.timezone);

    /**
     * GET ALL DISCOUNTS FOR SERVER FROM IIKO
     */
    /*const request = require('iiko-request');
    request.call({
      type: 'GET',
      path: '/api/0/deliverySettings/deliveryDiscounts',
      params: {
        organization: 'string',
        requestTimeout: 'time'
      }
    }, {
      organization: sails.config.restocore.iiko.organization,
      requestTimeout: '00:01:00'
    }).then(result => {
      console.dir(result, {depth: null, colors: true, maxArrayLength: null});
    }, error => {
      sails.log.error('discounts-for-gf sync error');
      sails.log.error(error);
    });*/
  }
};

function bindRouter(path, action) {
  if (!path || !action) {
    throw 'Cannot bind undefined path to undefined action';
  }

  if (!_.isString(path)) {
    throw 'path must be string, not ' + typeof path;
  }

  if (!_.isFunction(action)) {
    sails.log.error(action);
    throw 'action must be function, not ' + typeof action;
  }

  try {
    sails.router.bind(path, bindPolicy(path, action));
  } catch (e) {
    sails.log.error(e);
  }
}

let policies;

function loadPolicies() {
  const normalizedPath = require("path").join(__dirname, "../policies");

  const _policies = {};
  require("fs").readdirSync(normalizedPath).forEach(function (file) {
    _policies[file.split('.').slice(0, -1).join('.')] = require("../policies/" + file);
  });

  policies = _policies;
}

function bindPolicy(path, action) {
  if (!path || !action) {
    throw 'Cannot bind undefined path to undefined action';
  }
  let result = [];
  const info = policies.index;
  for (let i in info) {
    if (info.hasOwnProperty(i)) {
      if (i === path || i === '*') {
        if (!_.isArray(info[i])) {
          info[i] = [info[i]];
        }
        for (let j in info[i]) {
          if (info[i].hasOwnProperty(j)) {
            result.push(policies[info[i][j]]);
          }
        }
      }
    }
  }
  result.push(action);
  return result;
}
