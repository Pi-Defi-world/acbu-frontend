import React from "react"
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { ErrorBoundary } from '@/components/error-boundary'
import './globals.css'
import { AuthGuard } from '@/components/layout/auth-guard';
import { AppLayout } from '@/components/app-layout';
import { WalletSetupModal } from '@/components/wallet-setup-modal';
import { Toaster } from '@/components/ui/toaster';

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
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  const lang = "en";

  return (
    <html lang={lang}>
      <body className={`font-sans antialiased`}>
        <ErrorBoundary>
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
            <Analytics nonce={nonce} />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
