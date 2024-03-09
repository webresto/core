"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let countries = require("../libs/dictionaries/countries.json");
function default_1() {
    let countriesHash = {};
    countries.forEach(country => {
        countriesHash[country.iso] = country;
    });
    sails.hooks.restocore["dictionaries"] = {
        countries: countriesHash
    };
}
exports.default = default_1;
;
