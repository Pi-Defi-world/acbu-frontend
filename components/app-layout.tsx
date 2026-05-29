'use client';

import { MobileNav } from './mobile-nav';
import { usePathname } from 'next/navigation';
import { SessionExpiryWarning } from '@/components/session-expiry-warning';
import { useSessionGuard } from '@/hooks/use-session-guard';

const PUBLIC_PATHS = ['/auth/signin', '/auth/signup', '/auth/2fa', '/recovery'];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p) || pathname === p);
  const { status, dismissWarning, warningDismissed } = useSessionGuard();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isPublic && (
        <SessionExpiryWarning
          status={status}
          onDismiss={dismissWarning}
          dismissed={warningDismissed}
        />
      )}
      <main className={`flex-1 ${!isPublic ? 'pb-24' : ''}`}>{children}</main>
      {!isPublic && <MobileNav />}
    </div>
  );
}
