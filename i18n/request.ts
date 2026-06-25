import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'en-NG', 'en-KE', 'ar', 'ru', 'pl'] as const;
export const defaultLocale = 'en';

type Locale = (typeof locales)[number];

function isSupportedLocale(locale: string | undefined): locale is Locale {
  return locale !== undefined && (locales as readonly string[]).includes(locale);
}

/**
 * Load the message bundle for a locale, falling back to the default locale's
 * messages if the requested bundle cannot be loaded (e.g. a failed dynamic
 * import or a CDN/network error). This guarantees the app always renders with
 * a complete set of translations instead of showing missing/raw message keys.
 */
async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  try {
    return (await import(`./messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`[i18n] Failed to load messages for locale "${locale}".`, error);

    // Avoid an infinite fallback loop if the default bundle itself fails.
    if (locale === defaultLocale) {
      return {};
    }

    try {
      return (await import(`./messages/${defaultLocale}.json`)).default;
    } catch (fallbackError) {
      console.error(
        `[i18n] Failed to load fallback messages for default locale "${defaultLocale}".`,
        fallbackError,
      );
      return {};
    }
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  // next-intl 4.x exposes the negotiated locale via `requestLocale`.
  const requested = await requestLocale;

  // Validate that the incoming locale is supported before using it.
  if (!isSupportedLocale(requested)) notFound();

  return {
    locale: requested,
    messages: await loadMessages(requested),
  };
});
