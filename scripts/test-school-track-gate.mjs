import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function source(path) {
  return readFile(path, 'utf8')
}

const [
  env,
  registerRoute,
  bookingRoute,
  moderationRoute,
  firestoreClient,
  publicFlags,
  serverFlags,
  studentPage,
  tutorPage,
  homePage,
] = await Promise.all([
  source('.env.example'),
  source('artifacts/medstart/app/api/auth/register/route.ts'),
  source('artifacts/medstart/app/api/bookings/route.ts'),
  source('artifacts/medstart/app/api/moderation/tutors/route.ts'),
  source('artifacts/medstart/lib/firestore.ts'),
  source('artifacts/medstart/lib/feature-flags.ts'),
  source('artifacts/medstart/lib/server/feature-flags.ts'),
  source('artifacts/medstart/app/register/student/page.tsx'),
  source('artifacts/medstart/app/register/tutor/page.tsx'),
  source('artifacts/medstart/app/page.tsx'),
])

assert.match(env, /^MEDSTART_SCHOOL_TRACK_ENABLED=false$/m)
assert.match(env, /^NEXT_PUBLIC_MEDSTART_SCHOOL_TRACK_ENABLED=false$/m)

assert.match(publicFlags, /NEXT_PUBLIC_MEDSTART_SCHOOL_TRACK_ENABLED/)
assert.match(serverFlags, /MEDSTART_SCHOOL_TRACK_ENABLED/)
assert.match(serverFlags, /import 'server-only'/)

for (const [label, text] of [
  ['registration', registerRoute],
  ['booking', bookingRoute],
  ['moderation', moderationRoute],
]) {
  assert.match(text, /schoolTrackEnabled\(\)/, `${label} must enforce the server feature gate`)
}

assert.match(registerRoute, /SCHOOL_TRACK_DISABLED/)
assert.match(registerRoute, /learnerTrack === 'school'/)
assert.match(registerRoute, /tutorAudiences\.includes\('school'\)/)
assert.match(bookingRoute, /learnerTrack === 'school' && !schoolTrackEnabled\(\)/)
assert.match(moderationRoute, /SCHOOL_TRACK_DISABLED/)
assert.match(moderationRoute, /!tutorAudiences\.includes\('medical'\)/)

assert.match(firestoreClient, /SCHOOL_TRACK_ENABLED/)
assert.match(firestoreClient, /visibleTutorForCurrentScope/)
assert.match(firestoreClient, /profile\.tutorAudiences\.includes\('medical'\)/)

for (const [label, text] of [
  ['student registration UI', studentPage],
  ['tutor registration UI', tutorPage],
  ['public home UI', homePage],
]) {
  assert.match(text, /SCHOOL_TRACK_ENABLED/, `${label} must hide school scope when disabled`)
}

console.log('School/minor product-scope feature gate contract passed.')
