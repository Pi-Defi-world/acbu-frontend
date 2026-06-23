<<<<<<< HEAD
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
=======
import { validateEnv } from './lib/env-safety.js';

validateEnv(process.env);
>>>>>>> upstream/dev

/** @type {import('next').NextConfig} */
const nextConfig = {
<<<<<<< HEAD
  images: {
    unoptimized: true,
=======
  typescript: {
<<<<<<< HEAD
    ignoreBuildErrors: true,
>>>>>>> origin/dev
=======
    // F-001: TypeScript errors must fail the build to prevent shipping broken code
    ignoreBuildErrors: false,
  },
  // Improve tree-shaking for large packages and local UI exports
  experimental: {
    optimizePackageImports: {
      'lucide-react': {
        transform: 'lucide-react/dist/esm/icons/{{member}}',
        preventFullImport: true,
      },
      '@/components/ui': {
        transform: '@/components/ui/{{member}}',
        preventFullImport: true,
      },
    },
>>>>>>> upstream/dev
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

<<<<<<< HEAD
export default withNextIntl(nextConfig)
=======
export default withBundleAnalyzer(nextConfig);
>>>>>>> upstream/dev
