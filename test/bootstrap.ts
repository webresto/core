import 'mocha';
import assert = require('assert');
import * as _ from '@sailshq/lodash';
require('dotenv').config()
var Sails = require('./fixture/node_modules/sails').Sails;

  before(function (done) {
    let rc: void = require('./fixture/app').rc;
    this.timeout(50000);
    Sails().lift(rc, function (err: any, _sails: any) {
      if (err) return done(err);
      global.sails = _sails;
      return done();
    });
  });

  after(function(done) {
    if (global.sails) {
      return global.sails.lower(
        function (err) {
          if (err) {
            done();
            return process.exit(2);
          }
          done();
          return process.exit(0);
        }
      );
    }
    done();
    return process.exit(2);
  });

  declare global {
    namespace NodeJS {
      interface Global {
        sails: any
      } 
    }
  }

