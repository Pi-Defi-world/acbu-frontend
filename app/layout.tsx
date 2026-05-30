import React from "react"
import dynamic from 'next/dynamic'
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { I18nProvider } from '@/contexts/i18n-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { GlobalErrorHandler } from '@/components/global-error-handler'
import './globals.css'
import { AuthGuard } from '@/components/layout/auth-guard';
import { AppLayout } from '@/components/app-layout';
import { WalletSetupModal } from '@/components/wallet-setup-modal';
import { Toaster } from '@/components/ui/toaster';

const OfflineIndicator = dynamic(
  () => import('@/components/offline-indicator').then((m) => ({ default: m.OfflineIndicator })),
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

// FIXED: Removed maximumScale to allow zooming
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
<<<<<<< HEAD
  // Remove maximumScale to allow users to zoom
  userScalable: true,
=======
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a0a2e' },
  ],
>>>>>>> upstream/dev
}

export default async function RootLayout({
  children,
<<<<<<< HEAD
}: {
  children: React.ReactNode;
}) {
  return children;
=======
}: Readonly<{
  children: React.ReactNode
}>) {
  // Read the nonce injected by middleware so Next.js can apply it to
  // inline scripts/styles it generates (e.g. __NEXT_DATA__).
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? undefined;
  const lang = "en";

  return (
    <html lang={lang} dir="ltr">
      <body className={`font-sans antialiased`}>
        <GlobalErrorHandler />
        <OfflineIndicator />
        <ErrorBoundary level="app">
          <I18nProvider>
          <AuthProvider>
           {/*  <AuthGuard>*/}
              <AppLayout>{children}</AppLayout>
            {/*</AuthGuard>*/}
            <WalletSetupModal />
            <Toaster />
            {/*
              F-065 SRI review: the only third-party script injected here is
              @vercel/analytics/next, which is bundled at build time (first-party,
              no external CDN fetch). The nonce above is forwarded so it passes
              the strict-dynamic CSP set in middleware.ts.

              If any external CDN scripts (<Script src="https://..."/>) are added
              in the future, they MUST include integrity + crossOrigin="anonymous"
              attributes, e.g.:
                <Script
                  src="https://cdn.example.com/lib.js"
                  integrity="sha384-<hash>"
                  crossOrigin="anonymous"
                  nonce={nonce}
                />
              SRI hashes can be generated at https://www.srihash.org/
            */}
            <Analytics nonce={nonce} crossOrigin="anonymous" />
          </AuthProvider>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
>>>>>>> origin/dev
}