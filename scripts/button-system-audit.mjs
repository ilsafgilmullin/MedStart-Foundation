import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOTS = [
  'artifacts/medstart/app',
  'artifacts/medstart/components',
]

const BUTTON_MARKERS = [
  'ms-btn',
  'ms-icon-btn',
  'ms-choice',
  'ms-link-action',
  'authPrimaryButtonClass',
  'ms-switch',
  'ms-row-action',
  'ms-color-swatch',
  'ms-overlay-close',
]

const CONFLICTING_ACTION_TOKENS = [
  'bg-black',
  'bg-slate-950',
  'bg-violet-600',
  'bg-violet-700',
  'bg-indigo-600',
  'bg-indigo-700',
  'bg-emerald-600',
  'bg-emerald-700',
  'bg-red-600',
  'bg-red-700',
  'text-black',
  'text-slate-950',
]

const REQUIRED_CSS_CLASSES = [
  '.ms-btn-primary',
  '.ms-btn-secondary',
  '.ms-btn-soft',
  '.ms-btn-white',
  '.ms-btn-on-dark',
  '.ms-btn-danger',
  '.ms-btn-danger-outline',
  '.ms-btn-ghost',
  '.ms-icon-btn',
  '.ms-choice',
  '.ms-switch',
  '.ms-row-action',
  '.ms-color-swatch',
]

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) walk(path, files)
    else if (/\.(?:tsx|jsx)$/.test(entry)) files.push(path)
  }
  return files
}

function openingTags(source, names) {
  const tags = []
  const expression = new RegExp(`<(?:${names.join('|')})\\b`, 'g')
  for (let match; (match = expression.exec(source)); ) {
    const start = match.index
    let quote = ''
    let escaped = false
    let braces = 0
    let brackets = 0
    let parentheses = 0
    let index = expression.lastIndex

    for (; index < source.length; index += 1) {
      const character = source[index]
      if (quote) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === quote) quote = ''
        continue
      }
      if (character === "'" || character === '"' || character === '`') {
        quote = character
        continue
      }
      if (character === '{') braces += 1
      else if (character === '}') braces = Math.max(0, braces - 1)
      else if (character === '[') brackets += 1
      else if (character === ']') brackets = Math.max(0, brackets - 1)
      else if (character === '(') parentheses += 1
      else if (character === ')') parentheses = Math.max(0, parentheses - 1)
      else if (character === '>' && !braces && !brackets && !parentheses) {
        tags.push({ start, text: source.slice(start, index + 1) })
        expression.lastIndex = index + 1
        break
      }
    }
  }
  return tags
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length
}

const failures = []
let buttonCount = 0
let actionLinkCount = 0

for (const file of ROOTS.flatMap((root) => walk(root))) {
  const source = readFileSync(file, 'utf8')
  const display = relative(process.cwd(), file)

  for (const tag of openingTags(source, ['button'])) {
    buttonCount += 1
    const marker = BUTTON_MARKERS.find((value) => tag.text.includes(value))
    if (!marker) {
      failures.push(`${display}:${lineNumber(source, tag.start)} button без семантического класса`)
      continue
    }
    const conflicts = CONFLICTING_ACTION_TOKENS.filter((value) => tag.text.includes(value))
    if (conflicts.length) {
      failures.push(`${display}:${lineNumber(source, tag.start)} конфликт цветов: ${conflicts.join(', ')}`)
    }
  }

  for (const tag of openingTags(source, ['Link', 'a'])) {
    const looksLikeAction =
      tag.text.includes('inline-flex') &&
      /(?:px-|py-|p-\d)/.test(tag.text) &&
      tag.text.includes('rounded-')
    if (!looksLikeAction) continue
    actionLinkCount += 1
    if (!BUTTON_MARKERS.some((value) => tag.text.includes(value))) {
      failures.push(`${display}:${lineNumber(source, tag.start)} CTA-ссылка без семантического класса`)
    }
  }
}

const css = readFileSync('artifacts/medstart/app/globals.css', 'utf8')
for (const required of REQUIRED_CSS_CLASSES) {
  if (!css.includes(required)) failures.push(`globals.css: отсутствует ${required}`)
}

if (buttonCount === 0) failures.push('Не найдено ни одной кнопки')

if (failures.length) {
  console.error(`Button system audit failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Button system audit passed: ${buttonCount} buttons, ${actionLinkCount} CTA links.`)
