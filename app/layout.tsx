import React from "react"
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { GlobalErrorHandler } from '@/components/global-error-handler'
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
  const lang = "en";

  return (
    <html lang={lang}>
      <body className={`font-sans antialiased`}>
        <GlobalErrorHandler />
        <ErrorBoundary level="app">
          <AuthProvider>
              <AuthGuard>
              <AppLayout>{children}</AppLayout>
            </AuthGuard>
            <WalletSetupModal />
            <Toaster />
            <Analytics />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
