import createMiddleware from "next-intl/middleware";

const locales = ["en", "en-NG", "en-KE"] as const;

export default createMiddleware({
  // next-intl negotiates a supported locale using the locale cookie and
  // Accept-Language when a request does not already identify a locale.
  locales: [...locales],
  defaultLocale: "en",
});

export const config = {
  // Run locale negotiation for application pages, not APIs, Next internals,
  // Vercel internals, or files with extensions (images, fonts, etc.).
  matcher: [
    "/",
    "/(en|en-NG|en-KE)/:path*",
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
