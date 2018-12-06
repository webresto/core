const iiko = require('iiko-delivery');

module.exports = {
  init: function (config) {
    iiko.init(config);
  },
  api: function (method, params, data, timeout) {
    return new Promise((resolve, reject) => {
      let alreadyCall = false;

      if (timeout) {
        if (!Number.isInteger(timeout))
          return reject('timeout must be integer');
        setTimeout(() => {
          if (!alreadyCall) {
            alreadyCall = true;
            return reject('timeout');
          }
        }, timeout);
      }

      iiko.api(method, params, data).then((data) => {
        if (!alreadyCall) {
          alreadyCall = true;
          return resolve(data);
        }
      });
    });
  }
};
