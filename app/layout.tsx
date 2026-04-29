import React from "react"
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { GlobalErrorHandler } from '@/components/global-error-handler'
import './globals.css'
import { AuthGuard } from '@/components/layout/auth-guard';
import { AppLayout } from '@/components/app-layout';
import { WalletSetupModal } from '@/components/wallet-setup-modal';
import { Toaster } from '@/components/ui/toaster';

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
  // Remove maximumScale to allow users to zoom
  userScalable: true,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}