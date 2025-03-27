"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function default_1() {
    if (!sails.hooks.i18n) {
        throw "sails hook i18n was not loaded, core bindTranslation failed";
    }
    try {
        if (sails.hooks.i18n.appendLocale === undefined) {
            sails.log.warn("sails.hooks.i18n.appendLocale");
            return;
        }
        const translations = fs.readdirSync(path.resolve(__dirname, `../libs/locales`)).filter(function (file) {
            return path.extname(file).toLowerCase() === ".json";
        });
        for (let locale of sails.config.i18n?.locales ?? []) {
            if (translations.includes(`${locale}.json`)) {
                try {
                    let jsonData = require(`../libs/locales/${locale}.json`);
                    sails.hooks.i18n.appendLocale(locale, jsonData);
                }
                catch (error) {
                    sails.log.error(`restocore bindTranslations > Error when reading ${locale}.json: ${error}`);
                }
            }
            else {
                sails.log.debug(`restocore bindTranslations > Cannot find ${locale} locale in translations directory`);
            }
        }
    }
    catch (e) {
        sails.log.warn("restocore bindTranslations > Error:", e);
    }
}
