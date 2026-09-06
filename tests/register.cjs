// Use the project's TypeScript compiler without a second test runner or paid APIs.
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const resolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  return resolve.call(
    this,
    request.startsWith('@/') ? path.resolve('src', request.slice(2)) : request,
    ...args
  )
}
require.extensions['.ts'] = function (module, filename) {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText,
    filename
  )
}
