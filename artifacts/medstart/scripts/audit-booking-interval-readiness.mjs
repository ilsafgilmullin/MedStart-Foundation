import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import {
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const projectId = String(process.env.MEDSTART_AUDIT_PROJECT_ID || '').trim()
const expectedProjectId = String(
  process.env.MEDSTART_EXPECTED_FIREBASE_PROJECT_ID || '',
).trim()
const reportPath = 'booking-interval-readiness-report.json'

if (!projectId || !expectedProjectId || projectId !== expectedProjectId) {
  throw new Error(
    'MEDSTART_AUDIT_PROJECT_ID must exactly match MEDSTART_EXPECTED_FIREBASE_PROJECT_ID.',
  )
}

const app =
  getApps().find((candidate) => candidate.options.projectId === projectId) ||
  initializeApp(
    {
      credential: applicationDefault(),
      projectId,
    },
    `booking-readiness-${Date.now()}`,
  )
const db = getFirestore(app)

function hashedId(id) {
  return createHash('sha256').update(id).digest('hex').slice(0, 16)
}

function validInterval(data) {
  const start = data.requestedStartAt
  const end = data.requestedEndAt
  if (!(start instanceof Timestamp) || !(end instanceof Timestamp)) return false
  const startMs = start.toMillis()
  const endMs = end.toMillis()
  const duration = Number(data.durationMinutes || 0)
  return (
    Number.isFinite(duration) &&
    duration >= 30 &&
    duration <= 180 &&
    endMs > startMs &&
    endMs - startMs === Math.trunc(duration) * 60_000
  )
}

const snapshot = await db
  .collection('bookings')
  .where('status', 'in', ['pending', 'accepted'])
  .get()

const invalid = []
for (const document of snapshot.docs) {
  if (!validInterval(document.data())) {
    invalid.push(hashedId(document.id))
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  projectId,
  mode: 'read-only',
  activeBookingsChecked: snapshot.size,
  invalidIntervalCount: invalid.length,
  invalidBookingIdHashes: invalid.slice(0, 50),
  readyForBoundedIntervalQueries: invalid.length === 0,
}
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report))

if (invalid.length) {
  console.error(
    'Active bookings without normalized requestedStartAt/requestedEndAt were found. Do not deploy bounded booking queries until a separately approved migration is complete.',
  )
  process.exitCode = 2
}
