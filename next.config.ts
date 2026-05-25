import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  webpack(config, { nextRuntime, webpack }) {
    if (nextRuntime === 'edge') {
      /**
       * Replace testmode/context.js with a no-op in Edge builds.
       *
       * Next.js 15 unconditionally bundles next/dist/experimental/testmode/context.js
       * into every Edge middleware. That module calls:
       *   const _async_hooks = require("node:async_hooks")
       *   const testStorage = new _async_hooks.AsyncLocalStorage()
       * at module init time. Vercel's Edge V8 isolate cannot CJS-require Node
       * built-ins, so the bundle throws `ReferenceError: __dirname is not defined`
       * on every cold start.
       *
       * Disable webpack's persistent filesystem cache for the edge compilation.
       * The build script (package.json) clears .next/ before each Vercel build,
       * which is the primary cache-bust. This is a secondary guard: if webpack
       * ever runs with a restored .next/cache/webpack/ it won't read stale
       * edge-server cache entries that predate this plugin.
       */
      config.cache = false
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /experimental[/\\]testmode[/\\]context/,
          path.resolve(__dirname, 'src/lib/testmode-noop.js')
        )
      )
    }
    return config
  },
}

export default nextConfig
