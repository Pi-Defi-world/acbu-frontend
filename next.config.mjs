import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit the self-contained `.next/standalone` bundle so the app can be
  // packaged into the Docker image (see Dockerfile). Safe on Vercel, which
  // uses its own server runtime.
  output: 'standalone',
  images: {
    unoptimized: true,
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
}

export default withNextIntl(nextConfig)
