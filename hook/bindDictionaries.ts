let countries = require("../lib/dictionaries/countries.json")
import { Country } from "../interfaces/Country";
export default function() {
    
    sails.dictionaries = {
        countries: {},
        currencies: {}
    } as ISailsDictionaries

    countries.forEach((country: Country) => {
        sails.dictionaries['countries'][country.iso] = country;

        sails.dictionaries.currencies[country.currencyISO] = {
            currency: country.currency,
            currencyISO: country.currencyISO,
            currencySymbol: country.currencySymbol,
            currencyUnit: country.currencyUnit
        }
    });


};
