/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Next.js 16: eslint is no longer configured here; next build does not run ESLint.
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig
