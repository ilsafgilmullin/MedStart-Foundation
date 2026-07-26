import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const sourcePath = 'scripts/apply-critical-hardening.mjs'
const runtimePath = '/tmp/medstart-apply-critical-hardening.mjs'
let source = readFileSync(sourcePath, 'utf8')

// Generated TypeScript uses string concatenation so the migration script does
// not need nested template-literal escaping.
source = source.replaceAll(
  'Authorization: \\\\`Bearer \\\\${token}\\\\`,',
  "Authorization: 'Bearer ' + token,",
)
source = source.replaceAll(
  'Authorization: \\`Bearer \\${token}\\`,',
  "Authorization: 'Bearer ' + token,",
)

writeFileSync(runtimePath, source)
await import(pathToFileURL(runtimePath).href)
