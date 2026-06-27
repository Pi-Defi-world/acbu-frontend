import bundleAnalyzer from '@next/bundle-analyzer';
import { validateEnv } from './lib/env-safety.js';

validateEnv(process.env);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

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
