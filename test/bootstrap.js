"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var Sails = require('./fixtures/v0.12-app/node_modules/sails').Sails;
before(function (done) {
    let rc = require('./fixtures/v0.12-app/app').rc;
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
                return process.exit(2);
            }
            done();
            return process.exit(0);
        });
    }
    done();
    return process.exit(2);
});
