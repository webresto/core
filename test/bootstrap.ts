import "mocha";
import * as _ from "@sailshq/lodash";
require("dotenv").config();
var Sails = require("./fixture/node_modules/sails").Sails;

before(function (done) {
  let rc: void = require("./fixture/app").rc;
  this.timeout(50000);
  Sails().lift(rc, function (err: any, _sails: any) {
    if (err) return done(err);
    global.sails = _sails;
    return done();
  });
});

after(function (done) {
  if (global.sails) {
    return global.sails.lower(function (err) {
      if (err) {
        done();
      }
      done();
    });
  }
  done();
});

declare global {
  namespace NodeJS {
    interface Global {
      sails: any;
    }
  }
}
