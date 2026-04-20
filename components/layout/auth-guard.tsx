'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

const PUBLIC_PATHS = ['/auth/signin', '/auth/signup', '/auth/2fa', '/recovery'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ...state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p) || pathname === p);
    if (!isPublic && !isAuthenticated) {
      router.replace('/auth/signin');
      return;
    }
  }, [isAuthenticated, state.stellarAddress, pathname, router]);

  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p) || pathname === p);
  if (!isPublic && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
