import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling pdfjs-dist for server code — it must be
  // resolved at runtime by Node.js so it can access its worker files.
  serverExternalPackages: ['pdfjs-dist'],

  webpack: (config) => {
    // pdfjs-dist lists canvas as an optional peer dependency for rendering.
    // For server-side text extraction we never render, so tell webpack to
    // treat canvas as external rather than try (and fail) to bundle it.
    config.externals = [...(Array.isArray(config.externals) ? config.externals : []), 'canvas']
    return config
  },
}

export default nextConfig
