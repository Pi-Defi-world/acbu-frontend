'use client';

import { MobileNav } from './mobile-nav';
import { PageTransition } from './page-transition';
import { usePathname } from 'next/navigation';

const PUBLIC_PATHS = ['/auth/signin', '/auth/signup', '/auth/2fa', '/recovery'];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p) || pathname === p);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className={`flex-1 ${!isPublic ? 'pb-24' : ''}`}>
        <PageTransition>{children}</PageTransition>
      </main>
      {!isPublic && <MobileNav />}
    </div>
  );
}
