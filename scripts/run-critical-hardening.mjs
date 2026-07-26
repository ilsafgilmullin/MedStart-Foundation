import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const sourcePath = 'scripts/apply-critical-hardening.mjs'
const runtimePath = '/tmp/medstart-apply-critical-hardening.mjs'
let source = readFileSync(sourcePath, 'utf8')

// The migration stores generated TypeScript inside template literals. Replace
// both authorization header lines before Node parses the generated migration.
source = source.replace(
  /^\s*Authorization:.*$/gm,
  "      Authorization: 'Bearer ' + token,",
)

writeFileSync(runtimePath, source)
await import(pathToFileURL(runtimePath).href)
