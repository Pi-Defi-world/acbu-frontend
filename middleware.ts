import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Content-Security-Policy middleware.
 *
 * Strategy:
 *  1. Generate a cryptographically random nonce per request.
 *  2. Build a strict CSP that allows only:
 *     - 'self' for scripts/styles (plus the nonce for inline Next.js chunks)
 *     - The app's own API origin for connect-src
 *     - Vercel Analytics endpoint
 *  3. Ship as Content-Security-Policy-Report-Only first so violations surface
 *     in the console without breaking the app (report-only phase).
 *     Flip to Content-Security-Policy once violations are resolved.
 *  4. Forward the nonce to the layout via a request header so it can be
 *     injected into <script nonce> / <style nonce> tags server-side.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateNonce(): string {
  // crypto.getRandomValues is available in the Edge runtime
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

function buildCsp(nonce: string): string {
  const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? '';

  // Collect connect-src origins
  const connectSrc = [
    "'self'",
    apiOrigin,
    'https://horizon.stellar.org',
    'https://horizon-testnet.stellar.org',
    'https://vitals.vercel-insights.com', // Vercel Analytics
  ]
    .filter(Boolean)
    .join(' ');

  const directives: Record<string, string> = {
    'default-src':  "'self'",
    'script-src':   `'self' 'nonce-${nonce}' 'strict-dynamic'`,
    'style-src':    `'self' 'nonce-${nonce}'`,
    'img-src':      "'self' data: blob:",
    'font-src':     "'self'",
    'connect-src':  connectSrc,
    'frame-src':    "'none'",
    'object-src':   "'none'",
    'base-uri':     "'self'",
    'form-action':  "'self'",
    // Report violations to the browser console (report-only phase)
    'report-uri':   '/api/csp-report',
  };

  return Object.entries(directives)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  // Pass nonce to the layout (server component reads this via next/headers)
  requestHeaders.set('x-nonce', nonce);
  // Pass CSP string so the layout can also set it via <meta> if needed
  requestHeaders.set('x-csp', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // -------------------------------------------------------------------------
  // Phase 1 — Report-Only: violations logged, nothing blocked.
  // When violations are resolved, rename to 'Content-Security-Policy'.
  // -------------------------------------------------------------------------
  response.headers.set('Content-Security-Policy-Report-Only', csp);

  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0'); // Disabled — CSP is the defence
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, icons, public assets
     * - api routes that handle their own headers
     */
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|placeholder).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
