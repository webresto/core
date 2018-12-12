const iiko = require('iiko-delivery');

let requestsCount = 0;
let stopped = false;

module.exports = {
  init: function (config) {
    iiko.init(config);
  },
  api: function (method, params, data, timeout) {
    return new Promise((resolve, reject) => {
      if (!stopped) {
        let alreadyCall = false;
        requestsCount++;
        sails.log.info(requestsCount);
        if (requestsCount > 5) {
          sails.log.info('IIKO OVER REQUEST');
          sails.emit('IIKO_OVER');
          stopped = true;
          sails.lower();
          reject('over iiko requests');
        }

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
        }, err => reject(err));
      } else {
        reject('over iiko requests');
      }
    });
  }
};

setInterval(() => {
  requestsCount = 0;
}, 1000);
