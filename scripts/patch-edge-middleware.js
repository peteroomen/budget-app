#!/usr/bin/env node
/**
 * Post-build patch: replace node:async_hooks CJS require in the Edge middleware bundle.
 *
 * Why this exists:
 *   Next.js bundles its own test-request-interception code (interceptTestApis / withRequest)
 *   into every Edge middleware. That code calls `require("node:async_hooks")` at module
 *   init time. Vercel's Edge V8 isolate doesn't support CJS require() for node built-ins,
 *   so the bundle throws `ReferenceError: __dirname is not defined` on first request.
 *
 *   The fix: replace the webpack external module stub with a synchronous in-process shim.
 *   AsyncLocalStorage is never populated outside of Next.js test mode, so the shim is
 *   functionally correct in production.
 *
 *   We patch AFTER `next build` rather than via a webpack plugin because:
 *   - Vercel's build cache can skip webpack compilation entirely, so emit hooks don't fire.
 *   - Next.js 15 production builds produce a minified bundle at server/src/middleware.js;
 *     any webpack hook approach needs re-validation whenever Next.js changes its output.
 */

const fs = require('fs')
const path = require('path')

// Next.js 15 production builds write the final Edge bundle here.
// (The dev server writes to server/middleware.js — a different file.)
const MIDDLEWARE_PATH = path.join(__dirname, '..', '.next', 'server', 'src', 'middleware.js')

// The exact minified string Next.js emits when externalising node:async_hooks.
// Confirmed in Next.js 15.3.x production builds.
const TARGET = '"use strict";e.exports=require("node:async_hooks")'

// Minified synchronous AsyncLocalStorage shim — safe for production because the store
// is never populated outside of Next.js test-proxy infrastructure.
const SHIM =
  '"use strict";' +
  'class _ALS{' +
  'constructor(){this._c=void 0}' +
  'run(s,c,...a){const p=this._c;this._c=s;try{return c(...a)}finally{this._c=p}}' +
  'getStore(){return this._c}' +
  'exit(c,...a){return this.run(void 0,c,...a)}' +
  'enterWith(s){this._c=s}' +
  'disable(){this._c=void 0}' +
  '}' +
  'e.exports={' +
  'AsyncLocalStorage:_ALS,' +
  'AsyncResource:class{' +
  'constructor(t){this.type=t}' +
  'runInAsyncScope(f,th,...a){return f.apply(th,a)}' +
  'static bind(f){return f}' +
  'bind(f){return f}' +
  '}}'

if (!fs.existsSync(MIDDLEWARE_PATH)) {
  console.error(`patch-edge-middleware: ${MIDDLEWARE_PATH} not found — skipping (safe to ignore in dev)`)
  process.exit(0)
}

let content = fs.readFileSync(MIDDLEWARE_PATH, 'utf8')

// Escape the target for use in a RegExp to count occurrences.
const escapedTarget = TARGET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const count = (content.match(new RegExp(escapedTarget, 'g')) || []).length

if (count === 0) {
  // Already patched (idempotent) or Next.js changed the format.
  console.log(
    'patch-edge-middleware: pattern not found (already patched or Next.js changed its output format) — skipping'
  )
  process.exit(0)
}

content = content.replaceAll(TARGET, SHIM)

fs.writeFileSync(MIDDLEWARE_PATH, content, 'utf8')

console.log(
  `patch-edge-middleware: replaced ${count} occurrence(s) of node:async_hooks require() with inline shim ✓`
)
