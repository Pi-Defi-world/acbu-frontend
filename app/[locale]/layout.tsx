import React, { Suspense } from "react"
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { NavigationGuardProvider } from '@/contexts/navigation-guard-context'
import { ErrorBoundary } from '@/components/error-boundary'
import '../globals.css'
import { AuthGuard } from '@/components/layout/auth-guard';
import { AppLayout } from '@/components/app-layout';
import { WalletSetupModal } from '@/components/wallet-setup-modal';
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

export const metadata: Metadata = {
  title: 'ACBU - P2P Transfers',
  description: 'Send and receive money securely with ACBU',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
      <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Preconnect to third-party domains to eliminate DNS+TCP latency (#509) */}
        <link rel="preconnect" href="https://va.vercel-scripts.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />
        {process.env.NEXT_PUBLIC_API_BASE_URL && (
          <>
            <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin} />
          </>
        )}
      </head>
      <body className={`font-sans antialiased`}>
        <Suspense fallback={<TranslationsFallback />}>
          <NextIntlClientProvider messages={messages}>
            <ErrorBoundary>
              <AuthProvider>
                <AuthGuard>
                  <AppLayout>{children}</AppLayout>
                </AuthGuard>
                <WalletSetupModal />
                <Analytics />
              </AuthProvider>
            </ErrorBoundary>
          </NextIntlClientProvider>
        </Suspense>
      </body>
    </html>
  )
}
