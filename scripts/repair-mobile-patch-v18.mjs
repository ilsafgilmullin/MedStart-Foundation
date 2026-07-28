import { readFileSync, writeFileSync } from 'node:fs'

const path = 'scripts/apply-mobile-messenger-stability-v18.mjs'
const lines = readFileSync(path, 'utf8').split('\n')
let repaired = 0

for (let index = 0; index < lines.length; index += 1) {
  if (lines[index].includes("'bound message group'")) {
    lines[index] = "replace(bubble, '        className={`flex max-w-[92%] flex-col sm:max-w-[78%] xl:max-w-[70%] ${', '        className={`flex min-w-0 max-w-[92%] flex-col sm:max-w-[78%] xl:max-w-[70%] ${', 'bound message group')"
    repaired += 1
  } else if (lines[index].includes("'bound message bubble'")) {
    lines[index] = "replace(bubble, '          className={`relative rounded-[22px] px-4 py-3 shadow-sm ${', '          className={`relative max-w-full overflow-hidden rounded-[22px] px-4 py-3 shadow-sm [overflow-wrap:anywhere] ${', 'bound message bubble')"
    repaired += 1
  } else if (lines[index].includes("'bound reaction picker'")) {
    lines[index] = "replace(bubble, 'className={`absolute bottom-10 z-20 flex gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${', 'className={`absolute bottom-10 z-20 flex max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${', 'bound reaction picker')"
    repaired += 1
  }
}

if (repaired !== 3) throw new Error(`Expected to repair 3 JSX template lines, repaired ${repaired}`)
writeFileSync(path, lines.join('\n'))
console.log('Repaired mobile patch script v18')
