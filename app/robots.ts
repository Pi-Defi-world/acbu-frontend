import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.acbu.io";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/signin", "/auth/signup", "/recovery"],
        disallow: [
          "/auth/2fa",
          "/auth/wallet-setup",
          "/me/",
          "/wallet/",
          "/send/",
          "/currency/",
          "/mint/",
          "/burn/",
          "/savings/",
          "/lending/",
          "/transactions/",
          "/activity/",
          "/bills/",
          "/fiat/",
          "/rates/",
          "/reserves/",
          "/business/",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
