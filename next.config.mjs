/** @type {import('next').NextConfig} */
// Build trigger: 2026-03-17 fresh environment
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
