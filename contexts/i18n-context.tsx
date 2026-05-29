'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { setLocale, getStoredLocale, t as translate } from '@/lib/i18n';

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState('en');

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  const handleSetLocale = useCallback((newLocale: string) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale: handleSetLocale, t: translate }),
    [locale, handleSetLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return { locale: getStoredLocale(), setLocale: () => {}, t: translate };
  }
  return ctx;
}
