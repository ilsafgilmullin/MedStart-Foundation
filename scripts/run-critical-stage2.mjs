import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const stagePath = 'scripts/apply-critical-stage2.mjs'
const runtimePath = '/tmp/medstart-critical-stage2.mjs'
const bookingsPath = 'artifacts/medstart/lib/bookings.ts'
const medicalLibPath = 'artifacts/medstart/lib/medical-workspace.ts'
const verifyPath = 'scripts/verify-critical-hardening.mjs'

const bookingsBefore = readFileSync(bookingsPath, 'utf8')
const medicalBefore = readFileSync(medicalLibPath, 'utf8')
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

const verifier = `import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function requireText(path, text, message) {
  if (!read(path).includes(text)) throw new Error(path + ': ' + message)
}

requireText(
  'firestore.rules',
  'function hasUsableAccount()',
  'отсутствует отзыв доступа для заблокированных аккаунтов',
)
requireText(
  'firestore.rules',
  '// Создание выполняется только серверным API',
  'клиент всё ещё может создавать заявки напрямую',
)
requireText(
  'firestore.rules',
  '// Статусы меняет только серверный API',
  'клиент всё ещё может напрямую менять статус занятия',
)
requireText(
  'firestore.rules',
  '// Медицинские поля записывает только сервер',
  'клиент всё ещё может напрямую менять медицинское пространство',
)
requireText(
  'firestore.rules',
  '// Ранее загруженные пользовательские файлы помещены в карантин.',
  'медицинские метаданные не помещены в карантин',
)
requireText(
  'storage.rules',
  '// Все ранее загруженные медицинские файлы помещены в карантин.',
  'медицинские файлы не помещены в карантин',
)
requireText(
  'artifacts/medstart/lib/firebase.ts',
  'memoryLocalCache()',
  'Firestore не переведён на память',
)

const firebaseClient = read('artifacts/medstart/lib/firebase.ts')
if (
  firebaseClient.includes('persistentLocalCache') ||
  firebaseClient.includes('persistentMultipleTabManager')
) {
  throw new Error('firebase.ts: приватные данные всё ещё сохраняются в IndexedDB')
}

const whiteboard = read(
  'artifacts/medstart/components/live/ServerlessWhiteboard.tsx',
)
if (whiteboard.includes('localStorage.') || whiteboard.includes('sessionStorage.')) {
  throw new Error('ServerlessWhiteboard.tsx: доска сохраняется в Web Storage')
}

requireText(
  'artifacts/medstart/lib/bookings.ts',
  '/api/bookings/create',
  'создание заявок не переведено на серверный API',
)
requireText(
  'artifacts/medstart/lib/bookings.ts',
  '/api/bookings/status',
  'статусы занятий не переведены на серверный API',
)
requireText(
  'artifacts/medstart/app/api/bookings/create/route.ts',
  "where('studentUid', '==', decoded.uid)",
  'не проверяются пересечения занятий студента',
)
requireText(
  'artifacts/medstart/lib/medical-workspace.ts',
  '/api/medical-workspace/save',
  'медицинские данные не переведены на серверную валидацию',
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
  'artifacts/medstart/app/api/medical-workspace/save/route.ts',
  "workspaceRef.collection('revisions')",
  'нет журнала ревизий медицинских данных',
)

console.log('Critical hardening invariants: OK')
`
writeFileSync(verifyPath, verifier)

console.log('Critical hardening stage 2 runner completed successfully.')
