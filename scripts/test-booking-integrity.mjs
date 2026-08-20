import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(path, 'utf8')

const [
  bookingRoute,
  actionRoute,
  bookingClient,
  adminAction,
  firestoreRules,
] = await Promise.all([
  read('artifacts/medstart/app/api/bookings/route.ts'),
  read('artifacts/medstart/app/api/bookings/action/route.ts'),
  read('artifacts/medstart/lib/bookings.ts'),
  read('artifacts/medstart/app/api/admin/action/route.ts'),
  read('firestore.secure.rules'),
])

for (const marker of [
  "collection('bookingCalendars').doc(input.tutorUid)",
  'await transaction.get(calendarRef)',
  "where('tutorUid', '==', input.tutorUid)",
  'requestedStartMs < existingEndMs',
  'requestedEndMs > existingStartMs',
  'revision: FieldValue.increment(1)',
]) {
  assert.equal(
    bookingRoute.includes(marker),
    true,
    `Booking creation integrity marker missing: ${marker}`,
  )
}

for (const marker of [
  'verifyIdToken(token, true)',
  "profile.status === 'active'",
  "collection('bookingCalendars').doc(tutorUid)",
  'await transaction.get(calendarRef)',
  "currentStatus === 'pending'",
  "currentStatus === 'accepted'",
  "nextStatus === 'cancelled'",
  "nextStatus === 'completed'",
  'Date.now() < requestedEnd',
  'revision: FieldValue.increment(1)',
]) {
  assert.equal(
    actionRoute.includes(marker),
    true,
    `Trusted booking action marker missing: ${marker}`,
  )
}

assert.equal(bookingClient.includes("fetch('/api/bookings/action'"), true)
assert.equal(bookingClient.includes('runTransaction'), false)
assert.equal(bookingClient.includes('transaction.update'), false)

const bookingRule = firestoreRules.match(
  /match \/bookings\/\{bookingId\} \{([\s\S]*?)\n\s*\}/,
)
assert.ok(bookingRule, 'Booking rules block is missing')
assert.match(bookingRule[1], /allow create: if false;/)
assert.match(bookingRule[1], /allow update: if false;/)
assert.match(bookingRule[1], /allow delete: if false;/)

const calendarRule = firestoreRules.match(
  /match \/bookingCalendars\/\{tutorId\} \{([\s\S]*?)\n\s*\}/,
)
assert.ok(calendarRule, 'Server-only booking calendar block is missing')
assert.match(calendarRule[1], /allow read, write: if false;/)

for (const marker of [
  "collection('bookingCalendars').doc(tutorUid)",
  'await transaction.get(calendarRef)',
  'revision: FieldValue.increment(1)',
  'transaction.set(auditRef',
  "['accepted', 'declined', 'cancelled'].includes(nextStatus)",
  "['cancelled', 'completed'].includes(nextStatus)",
]) {
  assert.equal(
    adminAction.includes(marker),
    true,
    `Owner booking recovery must preserve calendar integrity: ${marker}`,
  )
}

console.log('Booking server-only integrity contract tests passed.')
