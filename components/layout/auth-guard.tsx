"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { locales } from "@/i18n/locales";

// Bare (non-locale-prefixed) auth paths kept for backward compat
const AUTH_SEGMENTS = [
  "/auth/signin",
  "/auth/signup",
  "/auth/2fa",
  "/recovery",
];

function isPublicPath(pathname: string): boolean {
  // Match bare paths: /auth/signin, /recovery, etc.
  if (AUTH_SEGMENTS.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return true;
  // Match locale-prefixed paths: /en/auth/signin, /ar/auth/2fa, etc.
  for (const locale of locales) {
    const prefix = `/${locale}`;
    if (
      AUTH_SEGMENTS.some(
        (p) => pathname === prefix + p || pathname.startsWith(prefix + p + "/"),
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Extract the locale segment from a pathname, e.g. /en/... → 'en'. */
function getLocaleFromPath(pathname: string): string {
  for (const locale of locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))
      return locale;
  }
  return "en";
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, ...state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPublicPath(pathname) && isHydrated && !isAuthenticated) {
      const locale = getLocaleFromPath(pathname);
      router.replace(`/${locale}/auth/signin`);
      return;
    }
  }, [isAuthenticated, isHydrated, state.stellarAddress, pathname, router]);

  if (!isPublicPath(pathname) && (!isHydrated || !isAuthenticated)) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
