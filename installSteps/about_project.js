"use strict";

const path = require("path");
const fs = require("fs");
const slugify = require("slugify");

/**
 * The city an operator names during installation, as a `City` row.
 *
 * The setting is a form field and nothing more: the install is multi-city, so
 * every consumer — geocoding, zones, the storefront's city list — works from
 * `City` records. This is the one place the setting is turned into one, and
 * after it nothing reads `CITY` again.
 */
async function ensureCityRecord(name) {
    if (!name || !String(name).trim()) return;

    const cityName = String(name).trim();
    const slug = slugify(cityName, { remove: /[*+~.()'"!:@\\/]/g, lower: true, strict: true, locale: "en" });

    const existing = await City.findOne({ slug: slug });
    if (existing) return;

    await City.create({ name: cityName, slug: slug, isDeleted: false }).fetch();
}

class AboutProjectStep {
    constructor() {
        this.canBeSkipped = false;
        this.description = 'About project';
        this.ejsPath = path.resolve(__dirname, "../views/about_project.ejs");
        this.id = 'about-coreproject-step';
        this.scriptsUrl = '';
        this.sortOrder = 0;
        this.groupSortOrder = 0;
        this.stylesUrl = '';
        this.title = 'About Project';
        this.badge = 'about-project';
        this.isSkipped = false;
        this.settingsKeys = [
            "PROJECT_NAME",
            "RESTOCORE_URL",
            "COUNTRY_ISO",
            "CITY",
            "DEFAULT_CURRENCY_ISO",
            "DEFAULT_LOCALE",
            "FRONTEND_CHECKOUT_PAGE",
            "FRONTEND_ORDER_PAGE"
        ];
        this.renderer = "ejs";
        this.isProcessed = false;
        this.finallyDescription = null;
        this.payload = {};
        
        // Load countries data into payload
        try {
            const countriesPath = path.resolve(__dirname, "../libs/dictionaries/countries.json");
            const countriesData = fs.readFileSync(countriesPath, 'utf8');
            this.payload.countries = JSON.parse(countriesData);
        } catch (e) {
            console.error('Failed to load countries data:', e);
            this.payload.countries = [];
        }
    }

    async check() {
        console.log('Check AboutProjectStep');
        
        // Check if step was already completed
        const initSteps = await Settings.get("PROJECT_INIT_STEPS");
        if (initSteps && initSteps >= 1) {
            this.isProcessed = true;
            return true;
        }
        
        // Check if all required settings are filled
        const requiredSettings = [
            "PROJECT_NAME",
            "RESTOCORE_URL", 
            "COUNTRY_ISO",
            "CITY",
            "DEFAULT_CURRENCY_ISO",
            "DEFAULT_LOCALE",
            "FRONTEND_CHECKOUT_PAGE",
            "FRONTEND_ORDER_PAGE"
        ];
        
        for (const key of requiredSettings) {
            const value = await Settings.get(key);
            if (!value) {
                return false;
            }
        }
        
        return this.isProcessed;
    }

    async process(data, context) {
        // Save all settings from the form
        const settingsToSave = [
            "PROJECT_NAME",
            "RESTOCORE_URL",
            "COUNTRY_ISO",
            "CITY",
            "DEFAULT_CURRENCY_ISO",
            "DEFAULT_LOCALE",
            "FRONTEND_CHECKOUT_PAGE",
            "FRONTEND_ORDER_PAGE"
        ];
        
        for (const key of settingsToSave) {
            if (data[key]) {
                await Settings.set(key, { value: data[key] });
            }
        }

        await ensureCityRecord(data["CITY"]);

        // Mark this step as completed
        await Settings.set("PROJECT_INIT_STEPS", { value: 1 });
        
        // save data in context to process it on last step
        Object.assign(context, data);
        this.isProcessed = true;
    }

    async skip() {
        this.isProcessed = true;
    }

    async finally() {
        // Implementation if needed
    }
}

module.exports.default = AboutProjectStep;
