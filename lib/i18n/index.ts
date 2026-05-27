import { en } from './locales/en';

type TranslationValue = string | Record<string, unknown>;
type Translations = Record<string, TranslationValue>;

const locales: Record<string, Translations> = { en: en as unknown as Translations };

export function registerLocale(locale: string, translations: Translations): void {
  locales[locale] = translations;
}

export function setLocale(locale: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('acbu_locale', locale);
    } catch {
      // Storage unavailable
    }
  }
}

export function getStoredLocale(): string {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('acbu_locale') || 'en';
    } catch {
      // Storage unavailable
    }
  }
  return 'en';
}

export function t(path: string, params?: Record<string, string | number>): string {
  const locale = getStoredLocale();
  const keys = path.split('.');
  let result: unknown = locales[locale];
  for (const key of keys) {
    if (result && typeof result === 'object') {
      result = (result as Record<string, unknown>)[key];
    } else {
      result = undefined;
      break;
    }
  }
  if (typeof result !== 'string') {
    result = path;
  }
  if (params) {
    result = (result as string).replace(/\{(\w+)\}/g, (_, key) =>
      params[key] !== undefined ? String(params[key]) : `{${key}}`,
    );
  }
  return result as string;
}
