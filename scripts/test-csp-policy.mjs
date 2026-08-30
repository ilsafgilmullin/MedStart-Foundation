import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const middleware = await readFile('artifacts/medstart/middleware.ts', 'utf8')
const nextConfig = await readFile('artifacts/medstart/next.config.ts', 'utf8')
const layout = await readFile('artifacts/medstart/app/layout.tsx', 'utf8')

for (const marker of [
  'crypto.randomUUID()',
  "requestHeaders.set('x-nonce', nonce)",
  "requestHeaders.set('Content-Security-Policy', csp)",
  "response.headers.set('Content-Security-Policy', csp)",
  "`'nonce-${nonce}'`",
]) {
  assert.equal(
    middleware.includes(marker),
    true,
    `Missing nonce CSP marker: ${marker}`,
  )
}

assert.equal(
  middleware.includes("...(!isProduction ? [\"'unsafe-inline'\", \"'unsafe-eval'\"] : [])"),
  true,
  'unsafe-inline/eval must remain development-only.',
)
assert.equal(
  nextConfig.includes('Content-Security-Policy'),
  false,
  'Static next.config CSP must not compete with the per-request nonce policy.',
)
assert.equal(
  layout.includes("export const dynamic = 'force-dynamic'"),
  true,
  'Nonce pages must render dynamically so Next.js can consume the request nonce.',
)

const productionScriptBlock = middleware.match(
  /const scriptSources = \[([\s\S]*?)\]\.join\(' '\)/,
)?.[1]
assert.ok(productionScriptBlock, 'script-src construction is missing')
assert.equal(
  productionScriptBlock.includes("'unsafe-inline'") &&
    !productionScriptBlock.includes('!isProduction'),
  false,
  'Production script-src must not permit unsafe-inline.',
)

console.log('Strict per-request nonce CSP contract passed.')
