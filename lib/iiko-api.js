const iiko = require('iiko-delivery');

module.exports = {
  init: function (config) {
    iiko.init(config);
  },
  api: function (method, data) {
    return new Promise(resolve => resolve(iiko.api(method, data)));
    // return new Promise(resolve => {
    //   const fs = require('fs');
    //   const data = fs.readFileSync(process.cwd() + '/menu.json');
    //   resolve(JSON.parse(data.toString()));
    // });
  }
};
