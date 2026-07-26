import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const stagePath = 'scripts/apply-critical-stage2.mjs'
const runtimePath = '/tmp/medstart-critical-stage2.mjs'
const bookingsPath = 'artifacts/medstart/lib/bookings.ts'
const medicalLibPath = 'artifacts/medstart/lib/medical-workspace.ts'
const verifyPath = 'scripts/verify-critical-hardening.mjs'

const bookingsBefore = readFileSync(bookingsPath, 'utf8')
const medicalBefore = readFileSync(medicalLibPath, 'utf8')
const verifyBefore = readFileSync(verifyPath, 'utf8')
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

const generatedMedical = readFileSync(medicalLibPath, 'utf8')
const subscribeStart = generatedMedical.indexOf(
  'export function subscribeToMedicalAssets(',
)
const originalRandomStart = medicalBefore.indexOf('function randomId()')
if (subscribeStart < 0 || originalRandomStart < 0) {
  throw new Error('medical asset subscription boundaries not found')
}

const quarantinedSubscription = `export function subscribeToMedicalAssets(
  _bookingId: string,
  onChange: (assets: MedicalAsset[]) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  onChange([])
  return () => undefined
}

`
let medicalLib =
  generatedMedical.slice(0, subscribeStart) +
  quarantinedSubscription +
  medicalBefore.slice(originalRandomStart)

const loadStart = medicalLib.indexOf(
  'export async function loadMedicalAssetObjectUrl(',
)
const newLabStart = medicalLib.indexOf('export function newLabRow()', loadStart)
if (loadStart < 0 || newLabStart < 0) {
  throw new Error('medical asset loader boundaries not found')
}
const quarantinedLoaders = `export async function loadMedicalAssetObjectUrl(_asset: MedicalAsset) {
  throw new Error(
    'Ранее загруженные медицинские файлы помещены в карантин и недоступны участникам занятия.',
  )
}

export async function deleteMedicalAsset(_asset: MedicalAsset): Promise<void> {
  throw new Error(
    'Удаление карантинных медицинских файлов выполняется только администрацией.',
  )
}

`
medicalLib =
  medicalLib.slice(0, loadStart) +
  quarantinedLoaders +
  medicalLib.slice(newLabStart)
writeFileSync(medicalLibPath, medicalLib)

let verify = verifyBefore.replace(
  "if (whiteboard.includes('localStorage.')) {",
  "if (/localStorage\\.|sessionStorage\\./.test(whiteboard)) {",
)
verify = verify.replace(
  "'ServerlessWhiteboard.tsx: доска всё ещё сохраняется в localStorage'",
  "'ServerlessWhiteboard.tsx: доска всё ещё сохраняется в Web Storage'",
)
verify = verify.replace(
  `requireText(
  'firestore.rules',
  /match \/assets\/\{assetId\}[\s\S]*?allow create: if false;/,
  'клиент всё ещё может создавать медицинские метаданные',
)`,
  `requireText(
  'firestore.rules',
  '// Ранее загруженные пользовательские файлы помещены в карантин.',
  'клиент всё ещё может создавать или читать медицинские метаданные',
)`,
)
verify = verify.replace(
  `requireText(
  'storage.rules',
  /match \/medical-workspaces\/\{bookingId\}\/\{userId\}\/\{fileName\}[\s\S]*?allow create: if false;/,
  'загрузка пользовательских медицинских файлов не заблокирована',
)`,
  `requireText(
  'storage.rules',
  '// Все ранее загруженные медицинские файлы помещены в карантин.',
  'медицинские файлы не помещены в карантин',
)`,
)
verify = verify.replace(
  "console.log('Critical hardening invariants: OK')",
  `requireText(
  'firestore.rules',
  '// Статусы меняет только серверный API',
  'клиент всё ещё может напрямую менять статус занятия',
)
requireText(
  'artifacts/medstart/lib/bookings.ts',
  '/api/bookings/status',
  'статусы занятий не переведены на серверный API',
)
requireText(
  'artifacts/medstart/app/api/medical-workspace/save/route.ts',
  'WORKSPACE_CONFLICT',
  'нет защиты от конкурентной перезаписи медицинских данных',
)
requireText(
  'artifacts/medstart/app/api/medical-workspace/save/route.ts',
  'containsPotentialIdentifier',
  'нет серверной проверки возможных персональных данных пациента',
)
requireText(
  'storage.rules',
  '// Все ранее загруженные медицинские файлы помещены в карантин.',
  'ранее загруженные медицинские файлы не помещены в карантин',
)

console.log('Critical hardening invariants: OK')`,
)
writeFileSync(verifyPath, verify)

console.log('Critical hardening stage 2 runner completed successfully.')
