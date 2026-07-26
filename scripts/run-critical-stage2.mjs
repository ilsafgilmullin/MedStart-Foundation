import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const stagePath = 'scripts/apply-critical-stage2.mjs'
const runtimePath = '/tmp/medstart-critical-stage2.mjs'
const bookingsPath = 'artifacts/medstart/lib/bookings.ts'
const medicalLibPath = 'artifacts/medstart/lib/medical-workspace.ts'

const bookingsBefore = readFileSync(bookingsPath, 'utf8')
const statusStart = bookingsBefore.indexOf(
  'export async function changeBookingStatus(',
)
if (statusStart < 0) {
  throw new Error('changeBookingStatus fragment not found before stage 2')
}
const bookingsPrefix = bookingsBefore.slice(0, statusStart)

writeFileSync(runtimePath, readFileSync(stagePath, 'utf8'))
await import(pathToFileURL(runtimePath).href)

const statusFunction = `export async function changeBookingStatus(
  input: BookingActionInput,
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.actorUid) {
    throw new Error('Сессия устарела. Войдите в MedStart ещё раз.')
  }
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/bookings/status', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      bookingId: input.bookingId,
      nextStatus: input.nextStatus,
      response: clean(input.response ?? ''),
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
  }
  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось обновить занятие.')
  }
}
`
writeFileSync(bookingsPath, bookingsPrefix + statusFunction)

let medicalLib = readFileSync(medicalLibPath, 'utf8')
medicalLib = medicalLib.replace(
  'function randomId()\n}\n\nfunction randomId() {',
  'function randomId() {',
)
medicalLib = medicalLib.replace(
  'export function newLabRow()\n}\n\nexport function newLabRow() {',
  'export function newLabRow() {',
)
if (
  medicalLib.includes('function randomId()\n}') ||
  medicalLib.includes('export function newLabRow()\n}')
) {
  throw new Error('medical-workspace stage 2 produced a duplicate function')
}
writeFileSync(medicalLibPath, medicalLib)

console.log('Critical hardening stage 2 runner completed successfully.')
