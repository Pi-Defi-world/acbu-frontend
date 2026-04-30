import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  const isDev = process.env.NODE_ENV === 'development';
  
  // Define CSP directives
  // Using strict-dynamic with nonces for scripts
  // style-src includes nonce for styled-components or similar if used
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      isDev ? "'unsafe-eval'" : "",
    ].filter(Boolean),
    'style-src': ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'"], // unsafe-inline often needed for Next.js internal styles
    'img-src': ["'self'", "blob:", "data:", "https://*"], // Allow external images
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'connect-src': [
      "'self'", 
      "https://*.stellar.org", 
      "https://*.soroban-rpc.com",
      "https://*.vercel-analytics.com",
      isDev ? "ws://localhost:*" : ""
    ].filter(Boolean),
    'upgrade-insecure-requests': [],
  };

  const cspHeaderValue = Object.entries(cspDirectives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  
  // Start with Report-Only as per requirements
  const headerName = process.env.CSP_ENFORCE === 'true' 
    ? 'Content-Security-Policy' 
    : 'Content-Security-Policy-Report-Only';

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(headerName, cspHeaderValue);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
