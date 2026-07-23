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
    return [
      { source: '/account', destination: '/me', permanent: false },
      { source: '/account/profile', destination: '/me/profile', permanent: false },
      { source: '/account/kyc', destination: '/me/kyc', permanent: false },
      { source: '/account/recovery', destination: '/recovery', permanent: false },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
