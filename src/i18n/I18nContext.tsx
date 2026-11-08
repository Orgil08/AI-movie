import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Locale, DEFAULT_LOCALE, LOCALE_CONFIGS } from './types.js';
import { getLocaleFromPath, switchLocaleInCurrentUrl, detectBrowserLocale } from './routing.js';
import mnMessages from '../../messages/mn.json';
import enMessages from '../../messages/en.json';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: any;
  t: (namespace?: string) => (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18N_DICTIONARIES: Record<Locale, any> = {
  mn: mnMessages,
  en: enMessages
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // 1. Check URL pathname first
    if (typeof window !== 'undefined') {
      const pathLocale = getLocaleFromPath(window.location.pathname);
      if (pathLocale) return pathLocale;
    }
    // 2. Fallback to cookie/localStorage/browser detection
    return detectBrowserLocale();
  });

  const messages = useMemo(() => I18N_DICTIONARIES[locale] || I18N_DICTIONARIES.mn, [locale]);

  // Synchronize document attributes and cookies
  useEffect(() => {
    document.documentElement.lang = locale;

    // Persist in cookie (1 year) and localStorage
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `ai_movie_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem('ai_movie_locale', locale);
    } catch (e) {
      // ignore
    }

    // Dynamic Title & OpenGraph
    const isMn = locale === 'mn';
    const siteTitle = isMn
      ? 'SODON AI MOVIE — Киноны Дараагийн Үе'
      : 'SODON AI MOVIE — Next-Gen AI Cinema';
    document.title = siteTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        isMn
          ? 'Монголын анхны хиймэл оюун ухаант 4K стриминг платформ. Wire.mn QPay болон банкны найдвартай төлбөрийн системтэй.'
          : 'Premier 4K generative AI streaming entertainment platform, powered by official Wire.mn QPay gateway and secure bank settlement.'
      );
    }
  }, [locale]);

  // Handle locale change with state & URL preservation
  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;
    setLocaleState(newLocale);

    // Update browser URL without reload while preserving search parameters & state
    if (typeof window !== 'undefined') {
      const newUrl = switchLocaleInCurrentUrl(newLocale);
      window.history.pushState({ locale: newLocale }, '', newUrl);
    }
  };

  // Listen to popstate (back/forward browser buttons)
  useEffect(() => {
    const handlePopState = () => {
      const pathLocale = getLocaleFromPath(window.location.pathname);
      if (pathLocale && pathLocale !== locale) {
        setLocaleState(pathLocale);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [locale]);

  const t = (namespace?: string) => {
    return (key: string, vars?: Record<string, string | number>): string => {
      let value: any = messages;

      if (namespace) {
        const parts = namespace.split('.');
        for (const p of parts) {
          if (value && typeof value === 'object' && p in value) {
            value = value[p];
          } else {
            value = undefined;
            break;
          }
        }
      }

      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else if (messages[key]) {
        // Fallback to root key
        value = messages[key];
      }

      if (typeof value !== 'string') {
        // Fallback to default dictionary (mn)
        const fallbackDict = I18N_DICTIONARIES.mn;
        let fbVal = namespace && fallbackDict[namespace] ? fallbackDict[namespace][key] : fallbackDict[key];
        if (typeof fbVal === 'string') {
          value = fbVal;
        } else {
          return key;
        }
      }

      // Interpolate {var}
      if (vars) {
        let result = value;
        for (const [k, v] of Object.entries(vars)) {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
        return result;
      }

      return value;
    };
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      messages,
      t
    }),
    [locale, messages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}

/**
 * Hook matching next-intl's useTranslations syntax:
 * const t = useTranslations('Navigation');
 * t('home');
 */
export function useTranslations(namespace?: string) {
  const { t } = useI18n();
  return t(namespace);
}
