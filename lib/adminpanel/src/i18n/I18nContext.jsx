import React, { createContext, useState, useContext, useEffect } from 'react';

const I18nContext = createContext();
const FALLBACK_LOCALE = 'en';

function normalizeLocale(rawLocale) {
    const normalized = String(rawLocale || '').trim().toLowerCase().replace(/_/g, '-');
    if (!normalized) return '';
    const base = normalized.split('-')[0];
    if (base === 'uk') return 'ua';
    return base || normalized;
}

export function I18nProvider({ children, initialLocale, messages = null }) {
    // Get initial language from props, localStorage or browser preference or default to 'en'
    const getInitialLanguage = () => {
        const fromProps = normalizeLocale(initialLocale);
        if (fromProps) return fromProps;

        const saved = normalizeLocale(localStorage.getItem('stockManagerLanguage'));
        if (saved) return saved;

        const browserLang = normalizeLocale(navigator.language);
        if (browserLang) return browserLang;

        return FALLBACK_LOCALE;
    };

    const [language, setLanguage] = useState(getInitialLanguage);

    useEffect(() => {
        const normalizedLanguage = normalizeLocale(language) || FALLBACK_LOCALE;
        localStorage.setItem('stockManagerLanguage', normalizedLanguage);
    }, [language]);

    const t = (key, params = {}) => {
        const dictionary = messages || {};
        const translation = dictionary[key] || key;

        // Replace params like {count}
        return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
            return str.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue);
        }, translation);
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    return context;
}
