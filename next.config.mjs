/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/stoqr',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
