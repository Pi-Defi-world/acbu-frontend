import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  // Locale negotiation uses the locale cookie and Accept-Language for
  // requests handled by the localized route tree.
  locales: ["en", "en-NG", "en-KE"],
  defaultLocale: "en",
});

export const config = {
  // Keep this matcher scoped to routes implemented under app/[locale].
  // Do not apply locale-prefix redirects to root-level pages until those
  // routes are migrated into the localized route tree.
  matcher: ["/", "/(en|en-NG|en-KE)/:path*"],
};
