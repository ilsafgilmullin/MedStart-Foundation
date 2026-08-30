import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import {
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { PRIMARY_OWNER_UID } from '../lib/access-control.ts'

const projectId = String(process.env.MEDSTART_AUDIT_PROJECT_ID || '').trim()
const expectedProjectId = String(
  process.env.MEDSTART_EXPECTED_FIREBASE_PROJECT_ID || '',
).trim()
const reportPath = 'production-readiness-report.json'
const unresolvedAuditGraceMs = 15 * 60_000

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
    `production-readiness-${Date.now()}`,
  )
const db = getFirestore(app)
const auth = getAuth(app)

function hashedId(id) {
  return createHash('sha256').update(id).digest('hex').slice(0, 16)
}

function timestampMillis(value) {
  return value instanceof Timestamp ? value.toMillis() : 0
}

function validBookingInterval(data) {
  const start = data.requestedStartAt
  const end = data.requestedEndAt
  if (!(start instanceof Timestamp) || !(end instanceof Timestamp)) return false
  const duration = Number(data.durationMinutes || 0)
  return (
    Number.isFinite(duration) &&
    duration >= 30 &&
    duration <= 180 &&
    end.toMillis() > start.toMillis() &&
    end.toMillis() - start.toMillis() === Math.trunc(duration) * 60_000
  )
}

const blockers = []
const warnings = []

let ownerAuthReady = false
let ownerProfileReady = false
try {
  const owner = await auth.getUser(PRIMARY_OWNER_UID)
  ownerAuthReady = !owner.disabled && owner.emailVerified === true
} catch {
  ownerAuthReady = false
}
if (!ownerAuthReady) blockers.push('owner_auth_not_ready')

const ownerProfileSnapshot = await db.collection('users').doc(PRIMARY_OWNER_UID).get()
if (ownerProfileSnapshot.exists) {
  const ownerProfile = ownerProfileSnapshot.data() || {}
  ownerProfileReady = ownerProfile.status === 'active'
}
if (!ownerProfileReady) blockers.push('owner_profile_not_active')

const usersSnapshot = await db.collection('users').get()
let schoolStudentCount = 0
let schoolOnlyTutorCount = 0
let publicNonActiveTutorCount = 0
let invalidRoleCount = 0
const allowedRoles = new Set(['student', 'tutor', 'admin', 'moderator'])

for (const document of usersSnapshot.docs) {
  const data = document.data()
  if (!allowedRoles.has(String(data.role || ''))) invalidRoleCount += 1

  if (data.role === 'student' && data.learnerTrack === 'school') {
    schoolStudentCount += 1
  }

  if (data.role === 'tutor') {
    const audiences = Array.isArray(data.tutorAudiences)
      ? data.tutorAudiences.filter(
          (value) => value === 'medical' || value === 'school',
        )
      : []
    if (audiences.includes('school') && !audiences.includes('medical')) {
      schoolOnlyTutorCount += 1
    }
    if (data.isPublic === true && data.status !== 'active') {
      publicNonActiveTutorCount += 1
    }
  }
}

if (schoolStudentCount > 0) blockers.push('school_students_exist_while_scope_disabled')
if (schoolOnlyTutorCount > 0) blockers.push('school_only_tutors_exist_while_scope_disabled')
if (publicNonActiveTutorCount > 0) blockers.push('non_active_public_tutors_exist')
if (invalidRoleCount > 0) blockers.push('invalid_user_roles_exist')

const activeBookingsSnapshot = await db
  .collection('bookings')
  .where('status', 'in', ['pending', 'accepted'])
  .get()
const invalidBookingHashes = []
for (const document of activeBookingsSnapshot.docs) {
  if (!validBookingInterval(document.data())) {
    invalidBookingHashes.push(hashedId(document.id))
  }
}
if (invalidBookingHashes.length > 0) blockers.push('active_booking_intervals_not_normalized')

const knowledgeSnapshot = await db.collection('knowledgeSubmissions').get()
let unsafeKnowledgeCount = 0
let legacyPublishedPdfCount = 0
for (const document of knowledgeSnapshot.docs) {
  const data = document.data()
  if (data.sourceMode !== 'file') continue

  const status = String(data.status || '')
  const malwareScanStatus = String(data.malwareScanStatus || '')
  const storageState = String(data.storageState || '')
  const securityStatus = String(data.securityStatus || '')

  if (status === 'pending') {
    if (
      malwareScanStatus !== 'clean' ||
      storageState !== 'quarantined' ||
      securityStatus !== 'signature-verified'
    ) {
      unsafeKnowledgeCount += 1
    }
  }

  if (status === 'published') {
    if (
      malwareScanStatus !== 'clean' ||
      storageState !== 'published' ||
      securityStatus !== 'signature-verified'
    ) {
      legacyPublishedPdfCount += 1
    }
  }
}
if (unsafeKnowledgeCount > 0) blockers.push('pending_pdf_security_state_invalid')
if (legacyPublishedPdfCount > 0) blockers.push('legacy_published_pdf_requires_revalidation')

const startedAuditSnapshot = await db
  .collection('adminAuditLogs')
  .where('operationStatus', '==', 'started')
  .get()
let staleStartedAuditCount = 0
const now = Date.now()
for (const document of startedAuditSnapshot.docs) {
  const data = document.data()
  const created = timestampMillis(data.createdAt || data.startedAt)
  if (!created || now - created >= unresolvedAuditGraceMs) {
    staleStartedAuditCount += 1
  }
}
if (staleStartedAuditCount > 0) blockers.push('stale_admin_operations_require_review')

if (usersSnapshot.size === 0) warnings.push('users_collection_empty')

const report = {
  generatedAt: new Date().toISOString(),
  projectId,
  mode: 'read-only',
  ready: blockers.length === 0,
  blockers,
  warnings,
  checks: {
    ownerAuthReady,
    ownerProfileReady,
    usersChecked: usersSnapshot.size,
    invalidRoleCount,
    schoolStudentCount,
    schoolOnlyTutorCount,
    publicNonActiveTutorCount,
    activeBookingsChecked: activeBookingsSnapshot.size,
    invalidBookingIntervalCount: invalidBookingHashes.length,
    invalidBookingIdHashes: invalidBookingHashes.slice(0, 50),
    knowledgeSubmissionsChecked: knowledgeSnapshot.size,
    unsafePendingPdfCount: unsafeKnowledgeCount,
    legacyPublishedPdfCount,
    staleStartedAdminAuditCount: staleStartedAuditCount,
  },
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report))

if (blockers.length) {
  console.error(
    'Production readiness blockers were found. The audit is read-only; resolve them through separately approved operations before deployment.',
  )
  process.exitCode = 2
}
