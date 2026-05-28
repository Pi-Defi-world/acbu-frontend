import createMiddleware from 'next-intl/middleware';

<<<<<<< HEAD
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'en-NG', 'en-KE'],
=======
export function middleware(request: NextRequest) {
  // Block direct access to any markdown files served from public/
  if (request.nextUrl.pathname.endsWith('.md')) {
    return new NextResponse(null, { status: 404 });
  }

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
>>>>>>> origin/dev

  // Used when no locale matches
  defaultLocale: 'en'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(en|en-NG|en-KE)/:path*']
};