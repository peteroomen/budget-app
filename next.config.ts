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
       * Disable webpack's persistent cache for the edge compilation so Vercel's
       * restored build cache cannot serve a stale middleware chunk compiled before
       * this plugin was added. Without cache: false, webpack sees identical source
       * hashes and skips recompilation, serving the old broken bundle even though
       * the NormalModuleReplacementPlugin is now in the config.
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
