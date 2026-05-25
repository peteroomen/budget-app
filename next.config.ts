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
       * NormalModuleReplacementPlugin intercepts the normal module factory for
       * testmode/context before webpack ever sees the node:async_hooks import,
       * so the external is never created. The result is baked into webpack's
       * persistent cache — this fix survives Vercel's build cache.
       */
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
