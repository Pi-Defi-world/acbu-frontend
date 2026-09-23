'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

const PUBLIC_PATHS = ['/auth/signin', '/auth/signup', '/auth/2fa', '/recovery'];
const LOCALE_PREFIX = /^\/(en|en-NG|en-KE)(?=\/|$)/;

function getPathWithoutLocale(pathname: string | null) {
  return pathname?.replace(LOCALE_PREFIX, '') || '/';
}

function getSignInPath(pathname: string | null) {
  const locale = pathname?.match(LOCALE_PREFIX)?.[1] ?? 'en';
  return `/${locale}/auth/signin`;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, ...state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const isPublic = PUBLIC_PATHS.some((path) => pathWithoutLocale.startsWith(path));
  const signInPath = getSignInPath(pathname);

  useEffect(() => {
    if (!isPublic && isHydrated && !isAuthenticated && pathname !== signInPath) {
      router.replace(signInPath);
    }
  }, [isAuthenticated, isHydrated, isPublic, pathname, router, signInPath, state.stellarAddress]);

  if (!isPublic && (!isHydrated || !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
