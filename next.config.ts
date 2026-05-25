import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack(config, { nextRuntime, webpack }) {
    if (nextRuntime === 'edge') {
      // Disable Webpack caching for Edge to prevent stale middleware bundles.
      config.cache = false
      
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /experimental[/\\]testmode[/\\]context/,
          // Relative path works natively and avoids ESM __dirname issues
          './src/lib/testmode-noop.js'
        )
      )
    }
    return config
  },
}

export default nextConfig
