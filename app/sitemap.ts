import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.acbu.io";
  return [
    { url: `${base}/`, priority: 1.0, changeFrequency: "weekly" },
    { url: `${base}/auth/signin`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${base}/auth/signup`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${base}/recovery`, priority: 0.5, changeFrequency: "monthly" },
  ];
}
