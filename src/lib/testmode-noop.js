'use strict'
/**
 * No-op replacement for Next.js testmode/context.js in Edge middleware.
 *
 * Next.js unconditionally bundles its test-request-interception code
 * (withRequest / getTestReqInfo) into every Edge middleware. That module
 * requires node:async_hooks, which Vercel's Edge V8 isolate cannot CJS-
 * require, causing `ReferenceError: __dirname is not defined` on every cold
 * start.
 *
 * This file is substituted for testmode/context.js via NormalModuleReplacementPlugin
 * in next.config.ts (Edge runtime only). The testmode infrastructure is never
 * activated in production, so no-oping these exports is safe.
 */
Object.defineProperty(exports, '__esModule', { value: true })
exports.getTestReqInfo = function () {
  return undefined
}
exports.withRequest = function (req, reader, fn) {
  return fn()
}
