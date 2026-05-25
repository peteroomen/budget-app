import type { NextConfig } from 'next'

const ASYNC_HOOKS_SHIM =
  '"use strict";class _ALS{constructor(){this._c=void 0}run(s,c,...a){const p=this._c;this._c=s;try{return c(...a)}finally{this._c=p}}getStore(){return this._c}exit(c,...a){return this.run(void 0,c,...a)}enterWith(s){this._c=s}disable(){this._c=void 0}}e.exports={AsyncLocalStorage:_ALS,AsyncResource:class{constructor(t){this.type=t}runInAsyncScope(f,th,...a){return f.apply(th,a)}static bind(f){return f}bind(f){return f}}}'

interface WebpackCompiler {
  hooks: {
    emit: {
      tapAsync: (
        name: string,
        fn: (compilation: WebpackCompilation, cb: () => void) => void
      ) => void
    }
  }
}
interface WebpackCompilation {
  assets: Record<string, { source: () => unknown }>
}

class AsyncHooksEdgeShimPlugin {
  apply(compiler: WebpackCompiler) {
    // Hook into emit — fires just before files are written to disk, after all
    // processAssets stages. This is the last chance to modify an asset.
    compiler.hooks.emit.tapAsync('AsyncHooksEdgeShimPlugin', (compilation, callback) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RawSource } = require('webpack-sources') as { RawSource: new (s: string) => unknown }

      for (const [name, asset] of Object.entries(compilation.assets)) {
        const original = asset.source()
        if (typeof original !== 'string') continue
        if (!original.includes('"use strict";e.exports=require("node:async_hooks")')) continue

        const patched = original.replace(
          '"use strict";e.exports=require("node:async_hooks")',
          ASYNC_HOOKS_SHIM
        )
        ;(compilation.assets as Record<string, unknown>)[name] = new RawSource(patched)
      }
      callback()
    })
  }
}

const nextConfig: NextConfig = {
  webpack(config, { nextRuntime }) {
    if (nextRuntime === 'edge') {
      config.plugins.push(new AsyncHooksEdgeShimPlugin())
    }
    return config
  },
}

export default nextConfig
