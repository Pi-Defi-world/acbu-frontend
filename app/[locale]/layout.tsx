import type { ReactNode } from "react";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  // Resolve the locale from the dynamic route segment so the root layout
  // can announce the correct lang to assistive tech and crawlers.
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <Suspense fallback={<TranslationsFallback />}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <NavigationGuardProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </NavigationGuardProvider>
      </NextIntlClientProvider>
    </Suspense>
  );
}
