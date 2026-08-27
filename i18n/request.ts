import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'en-NG', 'en-KE'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!requested || !isValidLocale(requested)) {
    notFound();
  }

  return {
    locale: requested,
    messages: (await import(`./messages/${requested}.json`)).default
  };
});
