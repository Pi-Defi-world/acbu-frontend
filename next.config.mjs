/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Use webpack instead of Turbopack (less memory in dev)
  experimental: {
    turbo: false,
  },
  // Don't bundle heavy WASM packages server-side
  serverExternalPackages: [
    '@stellar/stellar-sdk',
    '@creit.tech/stellar-wallets-kit',
    '@aztec/bb.js',
    '@noir-lang/noir_js',
    '@noir-lang/noir_wasm',
    '@noir-lang/backend_barretenberg',
  ],
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
