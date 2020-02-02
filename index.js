'use strict';

module.exports = function (sails) {
  return {
    initialize: require('@webresto/core/lib/initialize').default(sails)
  };
};
