/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
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

export default nextConfig
