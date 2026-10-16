import { NextRequest, NextResponse } from "next/server";

// Keep in sync with i18n/locales.ts
const SUPPORTED_LOCALES = ["en", "en-NG", "en-KE", "ar", "ru", "pl"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";

// Cookie name used by next-intl and set by setLocale() in lib/i18n/index.ts
const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Resolve the preferred locale for a request.
 *
 * Priority order:
 *  1. NEXT_LOCALE cookie (set when user explicitly switches locale)
 *  2. Accept-Language header negotiation
 *  3. Default locale ('en')
 */
function resolveLocale(request: NextRequest): Locale {
  // 1. Explicit cookie
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 2. Accept-Language header — try each tag in quality order
  const acceptLang = request.headers.get("Accept-Language") ?? "";
  for (const part of acceptLang.split(",")) {
    const tag = part.split(";")[0].trim();
    // Exact match first (e.g. "en-NG")
    if (SUPPORTED_LOCALES.includes(tag as Locale)) {
      return tag as Locale;
    }
    // Language-only prefix match (e.g. "ar" matches "ar")
    const lang = tag.split("-")[0];
    const match = SUPPORTED_LOCALES.find(
      (l) => l === lang || l.startsWith(`${lang}-`),
    );
    if (match) return match;
  }

  // 3. Fallback
  return DEFAULT_LOCALE;
}

/**
 * Returns true if the pathname starts with one of the supported locale
 * prefixes, e.g. /en/..., /en-NG/..., etc.
 */
function hasLocalePrefix(pathname: string): boolean {
  return SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

// Paths that should NOT be redirected to a locale-prefixed URL.
// These are either Next.js internals, API routes, or static assets that the
// matcher config already excludes — but we double-check here for safety.
const SKIP_REDIRECT_PREFIXES = [
  "/api/",
  "/_next/",
  "/favicon",
  "/robots",
  "/sitemap",
  "/manifest",
];

function shouldSkipLocaleRedirect(pathname: string): boolean {
  return SKIP_REDIRECT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  // Block .md files
  if (request.nextUrl.pathname.endsWith(".md")) {
    return new NextResponse(null, { status: 404 });
  }

  const { pathname } = request.nextUrl;

  // ── Locale redirect ────────────────────────────────────────────────────
  // If the request does not already carry a locale prefix (e.g. /en/mint)
  // and is not an internal/API path, resolve the preferred locale and
  // redirect so that every page is served under a locale-prefixed URL.
  // This ensures the NEXT_LOCALE cookie is honoured on ALL routes, not just
  // the [locale] segment pages.
  if (!hasLocalePrefix(pathname) && !shouldSkipLocaleRedirect(pathname)) {
    const locale = resolveLocale(request);

    // Build the redirect URL preserving query string and hash
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Persist the resolved locale as a cookie so subsequent requests (and
    // the top-level pages that read it) stay consistent.
    redirectResponse.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      sameSite: "lax",
      // Don't set httpOnly so the client-side setLocale() can update it too
      httpOnly: false,
      // 1 year TTL
      maxAge: 60 * 60 * 24 * 365,
    });

    return redirectResponse;
  }

  // ── CSP / Security headers ─────────────────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const isDev = process.env.NODE_ENV === "development";

  const cspDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      isDev ? "'unsafe-eval'" : "",
    ].filter(Boolean),
    "style-src": ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", "https://*"],
    "font-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "report-uri": ["/api/csp-report"],
    "connect-src": [
      "'self'",
      "https://*.stellar.org",
      "https://*.soroban-rpc.com",
      "https://*.vercel-analytics.com",
      isDev ? "ws://localhost:*" : "",
    ].filter(Boolean),
    "upgrade-insecure-requests": [],
  };

  const cspString = Object.entries(cspDirectives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", cspString);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|woff2?|ttf|otf|map)).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
