import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import en from '../i18n/en.json';
import es from '../i18n/es.json';

type Lang = 'en' | 'es';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const translations: Record<Lang, any> = {
  en,
  es,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('kollabeo_lang') as Lang) || 'en');

  useEffect(() => {
    try {
      localStorage.setItem('kollabeo_lang', lang);
    } catch (e) {
      // ignore
    }
  }, [lang]);

  const t = (key: string, vars?: Record<string, string | number>) => {
    const parts = key.split('.');
    let value: any = translations[lang];
    for (const p of parts) {
      if (value && typeof value === 'object' && p in value) value = value[p];
      else {
        value = undefined;
        break;
      }
    }

    if (value === undefined) {
      // fallback to english
      let fallback: any = translations['en'];
      for (const p of parts) {
        if (fallback && typeof fallback === 'object' && p in fallback) fallback = fallback[p];
        else {
          fallback = undefined;
          break;
        }
      }
      value = fallback ?? key;
    }

    if (vars && typeof value === 'string') {
      Object.entries(vars).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
      });
    }

    return String(value);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
