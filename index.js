'use strict';

module.exports = function (sails) {
  return {
    initialize: require('./lib/initialize')(sails)
  };
};

module.exports = _.merge(module.exports, {
  actions: require('./lib/actions').default,
  between: require('./lib/causes').between,
  hookTools: require('./lib/hookTools')
});
