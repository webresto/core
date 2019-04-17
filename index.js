'use strict';

module.exports = function (sails) {
  return {
    initialize: require('./lib/initialize')(sails)
  };
};

module.exports = _.merge(module.exports, {
  iikoApi: require('./lib/iiko-api'),
  email: require('./lib/email'),
  generateGUID: require('./lib/generateGUID'),
  actions: require('./lib/actions')
});
