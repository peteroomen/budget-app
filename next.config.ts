import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Vercel auto-detects `src/` as the Next.js framework root (because app/ lives in src/app/)
  // and expects build output at src/.next. Setting distDir to match prevents the
  // "output directory not found" error on every Vercel deploy.
  distDir: 'src/.next',
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  webpack(config, { nextRuntime, webpack }) {
    if (nextRuntime === 'edge') {
      // Disable Webpack caching for Edge to prevent stale middleware bundles.
      config.cache = false

      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /experimental[/\\]testmode[/\\]context/,
          // Absolute path — relative paths resolve from the replaced module's
          // directory (inside node_modules), not the project root.
          path.resolve(process.cwd(), 'src/lib/testmode-noop.js')
        )
      )
    }
    return config
  },
}

export default nextConfig
