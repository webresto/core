let countries = require("../libs/dictionaries/countries.json")
import { Country } from "../interfaces/Country";
export default function() {
    
    sails.dictionaries = {} as ISailsDictionaries

    let countriesHash = {};
    countries.forEach((country: Country) => {
        countriesHash[country.iso] = country;
        sails.dictionaries['countries'][country.iso] = country;

        sails.dictionaries.currencies[country.currencyISO] = {
            currency: country.currency,
            currencyISO: country.currencyISO,
            currencySymbol: country.currencySymbol,
            currencyUnit: country.currencyUnit
        }
    });

    /** @deprecated */
    sails.hooks.restocore["dictionaries"] = { 
        countries: countriesHash
    }


};
