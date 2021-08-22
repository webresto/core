"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
require('dotenv').config();
var Sails = require('./fixture/node_modules/sails').Sails;
before(function (done) {
    let rc = require('./fixture/app').rc;
    this.timeout(50000);
    Sails().lift(rc, function (err, _sails) {
        if (err)
            return done(err);
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
