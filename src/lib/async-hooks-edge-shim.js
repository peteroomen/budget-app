/**
 * Edge-compatible AsyncLocalStorage shim.
 *
 * Vercel's Edge V8 runtime does not support CJS require("node:async_hooks"),
 * which Next.js bundles via its own test-request-interception infrastructure
 * (interceptTestApis / withRequest). Those features are test-only; in
 * production the AsyncLocalStorage context is never populated, so a
 * synchronous implementation is safe and fully correct.
 *
 * This shim is aliased to "node:async_hooks" in the Edge webpack build
 * (see next.config.ts) so the CJS require() pattern never runs on Vercel.
 */

class AsyncLocalStorage {
  constructor() {
    this._current = undefined
  }

  run(store, callback, ...args) {
    const prev = this._current
    this._current = store
    try {
      return callback(...args)
    } finally {
      this._current = prev
    }
  }

  getStore() {
    return this._current
  }

  exit(callback, ...args) {
    return this.run(undefined, callback, ...args)
  }

  enterWith(store) {
    this._current = store
  }

  disable() {
    this._current = undefined
  }
}

class AsyncResource {
  constructor(type) {
    this.type = type
  }

  runInAsyncScope(fn, thisArg, ...args) {
    return fn.apply(thisArg, args)
  }

  bind(fn) {
    return fn
  }

  static bind(fn) {
    return fn
  }
}

module.exports = { AsyncLocalStorage, AsyncResource }
