import React from "react"
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { AuthProvider } from '@/contexts/auth-context'
import { I18nProvider } from '@/contexts/i18n-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { GlobalErrorHandler } from '@/components/global-error-handler'
import './globals.css'
import { AppLayout } from '@/components/app-layout';
import { WalletSetupModal } from '@/components/wallet-setup-modal';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import dynamic from 'next/dynamic';

const OfflineIndicator = dynamic(
  () => import('@/components/offline-indicator').then((m) => ({ default: m.OfflineIndicator })),
  { ssr: false },
)

const VercelAnalytics = dynamic(
  () => import('@vercel/analytics/next').then((m) => ({ default: m.Analytics })),
  { ssr: false },
)

const apiBaseUrl =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
    : ''
const apiUrl =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL?.trim()
    : ''


function getApiOrigin(): string | null {
  const rawUrl = apiBaseUrl || apiUrl
  if (!rawUrl) return null

  try {
    return new URL(rawUrl).origin
  } catch {
    return null
  }
}

const apiOrigin = getApiOrigin()

if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'development' &&
  !apiBaseUrl &&
  !apiUrl
) {
  console.error(
    "\n=================================================================\n" +
    "🚨 CRITICAL MISSING CONFIGURATION 🚨\n" +
    "NEXT_PUBLIC_API_BASE_URL (or NEXT_PUBLIC_API_URL) is not set.\n" +
    "Without this, POST/auth requests will hit Next.js and return 405 errors.\n" +
    "Please update your .env.local file with your backend API root.\n" +
    "=================================================================\n"
  );
}

export const metadata: Metadata = {
  title: 'ACBU - P2P Transfers',
  description: 'Send and receive money securely with ACBU',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
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
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#433875' },
    { media: '(prefers-color-scheme: dark)', color: '#1a0a2e' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? undefined;
  const lang = "en";

  return (
    <html lang={lang} dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/placeholder-logo.svg" as="image" type="image/svg+xml" />
        {apiOrigin && (
          <>
            <link rel="dns-prefetch" href={apiOrigin} />
            <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
          </>
        )}
        {/*
          Print stylesheet is deferred until the browser enters print mode.
          media="print" prevents the browser from downloading and parsing
          this resource on non-print (screen/mobile) page loads.
        */}
        <link rel="stylesheet" href="/print.css" media="print" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const mql = window.matchMedia('(prefers-color-scheme: dark)');
                  function updateTheme(e) {
                    document.documentElement.classList.toggle('dark', e.matches);
                  }
                  mql.addEventListener('change', updateTheme);
                } catch (err) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <GlobalErrorHandler />
          <OfflineIndicator />
          <ErrorBoundary level="app">
            <I18nProvider>
              <AuthProvider>
                <AppLayout>{children}</AppLayout>
                <WalletSetupModal />
                <Toaster />
                {/*
                  F-065 SRI review: analytics is non-critical, so it is
                  dynamically loaded on the client instead of being emitted as a
                  beforeInteractive script that can block initial rendering.
                  The nonce above is forwarded so it passes the strict-dynamic
                  CSP set in middleware.ts.
                */}
                <VercelAnalytics nonce={nonce} crossOrigin="anonymous" />
              </AuthProvider>
            </I18nProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
