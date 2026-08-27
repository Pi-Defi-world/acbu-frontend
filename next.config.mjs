import bundleAnalyzer from '@next/bundle-analyzer';
import { validateEnv } from './lib/env-safety.js';

validateEnv(process.env);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Conditionally load the Sentry webpack plugin only when the required
// environment tokens are present (production CI builds).  This avoids
// forcing every developer to install the plugin locally.
let sentryWebpackPlugin;
if (
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
) {
  try {
    ({ sentryWebpackPlugin } = await import('@sentry/webpack-plugin'));
  } catch {
    console.warn(
      '[next.config] @sentry/webpack-plugin not installed — skipping source-map upload.',
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  typescript: {
    // F-001: TypeScript errors must fail the build to prevent shipping broken code
    ignoreBuildErrors: false,
  },
  crossOrigin: 'anonymous',
  // Improve tree-shaking for large packages and local UI exports
  experimental: {
    optimizePackageImports: ['lucide-react', '@/components/ui'],
  },
  // Don't advertise the framework to reduce attack surface
  poweredByHeader: false,

  /**
   * Image optimisation — intentional configuration (see docs/adr/image-pipeline.md)
   *
   * Optimisation is ENABLED (unoptimized is not set / defaults to false).
   * Next.js will resize, convert to modern formats, and serve images through
   * the built-in /_next/image endpoint.
   *
   * Remote patterns:
   *   - The API origin (NEXT_PUBLIC_API_BASE_URL) is whitelisted so that
   *     user avatars, KYC documents, and other media served from the backend
   *     can be loaded via next/image without disabling optimisation.
   *   - Add additional hostnames here rather than setting unoptimized:true.
   *
   * Caching:
   *   - minimumCacheTTL: 60 s floor to avoid thrashing the image endpoint
   *     on rapidly-changing assets.  CDN/Vercel Edge will respect
   *     Cache-Control headers emitted by the image handler above this floor.
   *
   * Formats:
   *   - avif first (best compression), webp fallback; browsers that support
   *     neither receive the original format (jpeg/png).
   */
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      // API origin — derives hostname from the runtime env var at build time.
      // If the env var is absent (e.g. during local dev without .env.local)
      // the pattern is simply omitted; add a localhost entry below if needed.
      ...(process.env.NEXT_PUBLIC_API_BASE_URL
        ? [
            {
              protocol: 'https',
              hostname: new URL(process.env.NEXT_PUBLIC_API_BASE_URL).hostname,
              pathname: '/**',
            },
          ]
        : []),
      // ── Add project-specific CDN / storage origins below ────────────────
      // Example — uncomment and fill in when a dedicated media CDN is added:
      // { protocol: 'https', hostname: 'media.acbu.io', pathname: '/**' },
    ],
  },

  // Emit hidden source maps in production so error stack traces can be
  // resolved to original source.  The maps are uploaded to the error
  // tracking service and then stripped from the public build output
  // (see webpack config below) so they are never served to browsers.
  productionBrowserSourceMaps: true,

  webpack(config, { isServer, dev }) {
    // --- Source-map upload (production client builds only) ----------------
    if (!dev && !isServer && sentryWebpackPlugin) {
      config.plugins.push(
        sentryWebpackPlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          // Upload source maps from the Next.js client chunks directory.
          sourcemaps: {
            assets: ['.next/static/**'],
            ignore: ['node_modules/**'],
            // Delete .map files from the build output after a successful
            // upload so they are never deployed to the CDN / public origin.
            deleteSourcemapsAfterUpload: true,
          },
          // Associate uploads with the current release (git SHA or build id).
          release: {
            name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
            create: true,
          },
          // Silence non-error output in CI to keep logs clean.
          silent: !process.env.CI,
        }),
      );
    }

    return config;
  },

  async redirects() {
    // Supported locale slugs – keep in sync with i18n/locales.ts
    const localePattern = '(en|en-NG|en-KE|ar|ru|pl)';

    return [
      // ── Locale-aware redirects (must come first so they take priority) ──
      // Visitors arriving at /:locale/account/* keep their locale on the way
      // to the canonical /me/* destination (fixes #766).
      {
        source: `/:locale${localePattern}/account`,
        destination: '/:locale/me',
        permanent: false,
      },
      {
        source: `/:locale${localePattern}/account/profile`,
        destination: '/:locale/me/profile',
        permanent: false,
      },
      {
        source: `/:locale${localePattern}/account/kyc`,
        destination: '/:locale/me/kyc',
        permanent: false,
      },
      {
        source: `/:locale${localePattern}/account/recovery`,
        destination: '/:locale/recovery',
        permanent: false,
      },

      // ── Bare (non-localised) redirects ──────────────────────────────────
      // Visitors without a locale prefix are redirected as before; the
      // locale middleware will add the preferred locale afterwards.
      { source: '/account', destination: '/me', permanent: false },
      { source: '/account/profile', destination: '/me/profile', permanent: false },
      { source: '/account/kyc', destination: '/me/kyc', permanent: false },
      { source: '/account/recovery', destination: '/recovery', permanent: false },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
