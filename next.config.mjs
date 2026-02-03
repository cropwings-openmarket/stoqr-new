/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // basePath removed - app.getstoqr.com and getstoqr.com serve at root
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
