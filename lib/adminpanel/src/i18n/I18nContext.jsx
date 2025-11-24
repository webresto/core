import React, { createContext, useState, useContext, useEffect } from 'react';
import { locales } from './locales';

const I18nContext = createContext();

export function I18nProvider({ children, initialLocale }) {
    // Get initial language from props, localStorage or browser preference or default to 'en'
    const getInitialLanguage = () => {
        if (initialLocale && locales[initialLocale]) return initialLocale;

        const saved = localStorage.getItem('stockManagerLanguage');
        if (saved && locales[saved]) return saved;

        const browserLang = navigator.language.split('-')[0];
        if (locales[browserLang]) return browserLang;

        return 'en';
    };

    const [language, setLanguage] = useState(getInitialLanguage);

    useEffect(() => {
        localStorage.setItem('stockManagerLanguage', language);
    }, [language]);

    const t = (key, params = {}) => {
        const translation = locales[language][key] || key;

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
