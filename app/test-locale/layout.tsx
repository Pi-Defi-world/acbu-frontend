import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Locale Test – ACBU',
  description: 'Internal locale testing page.',
  robots: { index: false, follow: false },
}

export default function TestLocaleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
