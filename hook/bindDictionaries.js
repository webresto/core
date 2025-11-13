"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
let countries = require("../libs/dictionaries/countries.json");
function default_1() {
    sails.dictionaries = {
        countries: {},
        currencies: {}
    };
    let countriesHash = {};
    countries.forEach((country) => {
        //@ts-ignore
        countriesHash[country.iso] = country;
        sails.dictionaries['countries'][country.iso] = country;
        sails.dictionaries.currencies[country.currencyISO] = {
            currency: country.currency,
            currencyISO: country.currencyISO,
            currencySymbol: country.currencySymbol,
            currencyUnit: country.currencyUnit
        };
    });
    /** @deprecated */
    sails.hooks.restocore["dictionaries"] = {
        countries: countriesHash
    };
}
;
