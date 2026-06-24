import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './locales';

export { locales, defaultLocale };

function isLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? defaultLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!isLocale(requestedLocale)) notFound();

  return {
    messages: (await import(`./messages/${requestedLocale}.json`)).default,
  };
});
