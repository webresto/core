'use strict';

module.exports = function (sails) {
  return {
    defaults: require('./lib/defaults'),
    initialize: require('./lib/initialize').default(sails)
  };
};
