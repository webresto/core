let countries = require("../libs/dictionaries/countries.json")
export default function() {
    let countriesHash = {};
    countries.forEach(country => {
        countriesHash[country.iso] = country;
    });

    sails.hooks.restocore["dictionaries"] = { 
        countries: countriesHash
    }
};
