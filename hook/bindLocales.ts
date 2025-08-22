import * as path from "path";
import * as fs from "fs";

export default async function () {
  if (!sails.hooks.i18n) {
    throw "sails hook i18n was not loaded, core bindTranslation failed"
  } 

  try {
    if (sails.hooks.i18n.appendLocale === undefined) {
      sails.log.warn("sails.hooks.i18n.appendLocale")
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
        } catch (error) {
          sails.log.error(`restocore bindTranslations > Error when reading ${locale}.json: ${error}`);
        }
      } else {
        sails.log.debug(`restocore bindTranslations > Cannot find ${locale} locale in translations directory`);
      }
    }
  } catch (e) {
    sails.log.warn("restocore bindTranslations > Error:", e);
  }
}

export async function coreI18n(key: string, target?: string): Promise<string> {
  try {
    const locales = sails.hooks.i18n.getLocales();
    const currentLocale = target ?? await Settings.get("DEFAULT_LOCALE");

    if (locales[currentLocale] && locales[currentLocale][key]) {
      return locales[currentLocale][key];
    } else {
      console.warn(`Translation for key '${key}' not found in locale '${currentLocale}'`);
      return key;
    }
  } catch (error) {
    console.error(`Error translating key '${key}':`, error);
    return key;
  }
}