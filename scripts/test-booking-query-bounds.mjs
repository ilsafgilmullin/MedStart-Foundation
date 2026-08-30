import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const createRoute = await readFile(
  'artifacts/medstart/app/api/bookings/route.ts',
  'utf8',
)
const actionRoute = await readFile(
  'artifacts/medstart/app/api/bookings/action/route.ts',
  'utf8',
)
const indexes = JSON.parse(await readFile('firestore.indexes.json', 'utf8'))

for (const marker of [
  ".where('status', 'in', ['pending', 'accepted'])",
  ".where('requestedStartAt', '<', Timestamp.fromMillis(requestedEndMs))",
  ".where('requestedEndAt', '>', Timestamp.fromMillis(requestedStartMs))",
  '.limit(MAX_ACTIVE_STUDENT_BOOKINGS)',
  'const activeStudentBookings = studentBookingsSnapshot.size',
]) {
  assert.equal(
    createRoute.includes(marker),
    true,
    `Create booking query lost bounded marker: ${marker}`,
  )
}

for (const marker of [
  ".where('status', '==', 'accepted')",
  ".where('requestedStartAt', '<', Timestamp.fromMillis(targetInterval.end))",
  ".where('requestedEndAt', '>', Timestamp.fromMillis(targetInterval.start))",
  'У занятия отсутствуют нормализованные временные метки.',
]) {
  assert.equal(
    actionRoute.includes(marker),
    true,
    `Booking action query lost bounded marker: ${marker}`,
  )
}

assert.equal(
  createRoute.includes(
    ".where('tutorUid', '==', input.tutorUid)\n    const studentBookingsQuery",
  ),
  false,
  'Create route must not preload the full tutor booking history.',
)
assert.equal(
  actionRoute.includes(
    ".where('tutorUid', '==', tutorUid)\n      const [actorSnapshot",
  ),
  false,
  'Action route must not preload the full tutor booking history.',
)

function hasIndex(prefix) {
  return indexes.indexes.some((index) => {
    if (index.collectionGroup !== 'bookings') return false
    const fields = index.fields.map((field) => field.fieldPath)
    return prefix.every((field, position) => fields[position] === field)
  })
}

assert.equal(
  hasIndex(['tutorUid', 'status', 'requestedStartAt', 'requestedEndAt']),
  true,
  'Tutor overlap composite index is missing.',
)
assert.equal(
  hasIndex(['studentUid', 'status']),
  true,
  'Student active-booking index is missing.',
)

const ttl = indexes.fieldOverrides?.find(
  (override) =>
    override.collectionGroup === 'securityRateLimits' &&
    override.fieldPath === 'expiresAt',
)
assert.ok(ttl, 'securityRateLimits.expiresAt TTL override is missing.')
assert.equal(ttl.ttl, true)
assert.deepEqual(ttl.indexes, [])

console.log('Bounded booking query and TTL configuration contract passed.')
