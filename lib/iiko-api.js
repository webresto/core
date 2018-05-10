const iiko = require('iiko-delivery');

module.exports = {
  init: function (config) {
    iiko.init(config);
  },
  api: function (method, data) {
    return new Promise(resolve => resolve(iiko.api(method, data)));
  }
};
