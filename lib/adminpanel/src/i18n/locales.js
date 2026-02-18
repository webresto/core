import en from './locales/en.json';
import esOverrides from './locales/es.json';
import zhOverrides from './locales/zh.json';
import hiOverrides from './locales/hi.json';
import arOverrides from './locales/ar.json';
import ruOverrides from './locales/ru.json';
import frOverrides from './locales/fr.json';
import uaOverrides from './locales/ua.json';

function withEnglishFallback(overrides = {}) {
  return { ...en, ...overrides };
}

export const locales = {
  en,
  es: withEnglishFallback(esOverrides),
  zh: withEnglishFallback(zhOverrides),
  hi: withEnglishFallback(hiOverrides),
  ar: withEnglishFallback(arOverrides),
  ru: withEnglishFallback(ruOverrides),
  fr: withEnglishFallback(frOverrides),
  ua: withEnglishFallback(uaOverrides),
};
