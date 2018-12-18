const iiko = require('iiko-delivery');

let requestsCount = 0;
let stopped = false;
let iikoFailsCounter = 0;

module.exports = {
  init: function (config) {
    iiko.init(config);
    sails.iikoFail = false;
  },
  api: function (method, params, data, timeout) {
    return new Promise((resolve, reject) => {
      if (!stopped) {
        let alreadyCall = false;
        requestsCount++;
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
            sails.iikoFail = false;
            iikoFailsCounter = 0;

            return resolve(data);
          }
        }, err => {
          if (err.fail) {
            iikoFailsCounter++;
            sails.log.info(err);
            if (iikoFailsCounter === 10) {
              if (!sails.iikoFail) {
                sails.iikoFail = true;
                reject("IIKO FAIL (бабайка упал)\n", err);
              } else {
                reject(err);
              }
            } else {
              reject(err);
            }
          } else {
            reject(err);
          }
        });
      } else {
        reject('over iiko requests');
      }
    });
  }
};

setInterval(() => {
  requestsCount = 0;
}, 1000);
