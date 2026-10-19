import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/**
 * Locale layout — wraps routes under /[locale] with the next-intl message
 * provider so all client components can call `useTranslations` / `useI18n`.
 *
 * NOTE: NavigationGuardProvider, AuthGuard, AuthProvider, and WalletSetupModal
 * are all mounted once in the root layout (app/layout.tsx).  They must NOT be
 * duplicated here — doing so was the root cause of W10-UI-010 (wallet modal
 * mounted twice) and would nest context providers redundantly on every request.
 */
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
