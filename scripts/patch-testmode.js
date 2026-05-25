'use strict'
/**
 * Patches next/dist/experimental/testmode/context.js to a no-op before next build.
 *
 * Next.js 15 unconditionally bundles this module into every Edge middleware.
 * It calls require("node:async_hooks") at module init time, which Vercel's Edge
 * V8 isolate cannot handle — producing `ReferenceError: __dirname is not defined`
 * on every cold start.
 *
 * Patching the source file changes its content hash, so webpack is forced to
 * recompile it even with a warm persistent cache.
 */
const fs = require('fs')
const path = require('path')

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'experimental',
  'testmode',
  'context.js'
)

const noop =
  "'use strict';\n" +
  "Object.defineProperty(exports, '__esModule', { value: true });\n" +
  "exports.getTestReqInfo = function () { return undefined; };\n" +
  "exports.withRequest = function (req, reader, fn) { return fn(); };\n"

try {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null
  if (current === noop) {
    console.log('[patch-testmode] already patched — skipping')
  } else {
    fs.writeFileSync(target, noop, 'utf8')
    console.log('[patch-testmode] patched testmode/context.js')
  }
} catch (e) {
  console.warn('[patch-testmode] could not patch testmode/context.js:', e.message)
}
