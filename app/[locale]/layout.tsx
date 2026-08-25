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
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  // params is needed to satisfy Next.js dynamic segment typing; locale is
  // resolved by next-intl's request config so getMessages() picks it up
  // automatically without us having to forward it explicitly.
  await params;
  const messages = await getMessages();

  return (
    <Suspense fallback={<TranslationsFallback />}>
      <NextIntlClientProvider messages={messages}>
        <NavigationGuardProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </NavigationGuardProvider>
      </NextIntlClientProvider>
    </Suspense>
  );
}
