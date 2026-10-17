import React, { Suspense } from "react"
import { NavigationGuardProvider } from '@/contexts/navigation-guard-context'
import { AuthGuard } from '@/components/layout/auth-guard';
import { Spinner } from '@/components/ui/spinner';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

function TranslationsFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

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
