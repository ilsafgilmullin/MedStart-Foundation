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

// Two Storage sections intentionally use the same delete guard. For this one
// exact fragment both occurrences must be hardened instead of treated as an
// ambiguous migration error.
source = source.replace(
  "  if (content.indexOf(search, first + search.length) >= 0) {\n    throw new Error(`${path}: fragment occurs more than once`)\n  }",
  "  if (content.indexOf(search, first + search.length) >= 0) {\n    if (path === 'storage.rules' && search.includes('allow delete: if signedIn()')) {\n      write(path, content.split(search).join(replacement))\n      return\n    }\n    throw new Error(`${path}: fragment occurs more than once`)\n  }",
)

writeFileSync(runtimePath, source)

try {
  await import(pathToFileURL(runtimePath).href)

  const boardPath =
    'artifacts/medstart/components/live/ServerlessWhiteboard.tsx'
  const board = readFileSync(boardPath, 'utf8')
  const oldResizeFallback = `    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(render)
      observer.observe(container)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', render)
    return () => window.removeEventListener('resize', render)`
  const newResizeFallback = `    const ResizeObserverCtor = (
      window as Window & { ResizeObserver?: typeof ResizeObserver }
    ).ResizeObserver
    if (ResizeObserverCtor) {
      const observer = new ResizeObserverCtor(render)
      observer.observe(container)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', render)
    return () => window.removeEventListener('resize', render)`
  if (!board.includes(oldResizeFallback)) {
    throw new Error('ServerlessWhiteboard ResizeObserver fragment not found')
  }
  writeFileSync(boardPath, board.replace(oldResizeFallback, newResizeFallback))
} catch (error) {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
}
