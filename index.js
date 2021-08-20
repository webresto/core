'use strict';

module.exports = function (sails) {
  return {
    defaults: require('./lib/defaults'),
    initialize: require('./lib/initialize').default(sails)
  };
};

module.exports.HookTools = require("./lib/hookTools");
