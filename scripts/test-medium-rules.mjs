import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { getBytes, ref, uploadBytes } from 'firebase/storage'

const projectId = process.env.GCLOUD_PROJECT || 'demo-medstart'
const firestoreRules = await readFile('firestore.secure.rules', 'utf8')
const storageRules = await readFile('storage.rules', 'utf8')

const environment = await initializeTestEnvironment({
  projectId,
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: firestoreRules,
  },
  storage: {
    host: '127.0.0.1',
    port: 9199,
    rules: storageRules,
  },
})

const studentUid = 'medium-student'
const tutorUid = 'medium-tutor'
const newStudentUid = 'medium-new-student'
const bookingId = 'medium-booking'
const oldBookingId = 'medium-old-booking'

function profile(uid, role, status = 'active') {
  return {
    uid,
    firstName: role === 'tutor' ? 'Тест' : 'Учебный',
    lastName: role === 'tutor' ? 'Репетитор' : 'Студент',
    displayName: role === 'tutor' ? 'Тест Репетитор' : 'Учебный Студент',
    email: `${uid}@example.test`,
    role,
    status,
    avatar: '',
    fieldOfStudy: role === 'student' ? 'medicine' : '',
    studyYear: role === 'student' ? '2' : '',
    title: '',
    specialization: role === 'tutor' ? 'Кардиология' : '',
    subjects: role === 'tutor' ? ['Кардиология'] : [],
    institution: '',
    experience: '',
    bio: '',
    city: '',
    lessonPrice: role === 'tutor' ? 1000 : 0,
    lessonDuration: 60,
    lessonFormats: ['online'],
    timezone: 'Europe/Moscow',
    rating: 0,
    reviewsCount: 0,
    isPublic: false,
    notificationPreferences: {
      bookingUpdates: true,
      newMessages: true,
      lessonReminders: true,
      productNews: false,
    },
    onboardingCompleted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

function availabilityDay(enabled, start = '09:00', end = '18:00') {
  return { enabled, start, end }
}

function availabilityDays(monday = availabilityDay(true)) {
  return {
    monday,
    tuesday: availabilityDay(true),
    wednesday: availabilityDay(true),
    thursday: availabilityDay(true),
    friday: availabilityDay(true),
    saturday: availabilityDay(false),
    sunday: availabilityDay(false),
  }
}

function material(url, kind = 'link') {
  return {
    bookingId,
    tutorUid,
    tutorName: 'Тест Репетитор',
    studentUid,
    studentName: 'Учебный Студент',
    title: 'Учебный материал',
    description: 'Материал для подтверждённого занятия.',
    url,
    kind,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

async function seed() {
  const oldCompletedAt = Timestamp.fromMillis(
    Date.now() - 181 * 24 * 60 * 60 * 1000,
  )

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'users', studentUid), profile(studentUid, 'student'))
    await setDoc(doc(db, 'users', tutorUid), {
      ...profile(tutorUid, 'tutor'),
      isPublic: true,
    })

    await setDoc(doc(db, 'bookings', bookingId), {
      studentUid,
      studentName: 'Учебный Студент',
      studentAvatar: '',
      tutorUid,
      tutorName: 'Тест Репетитор',
      tutorAvatar: '',
      subject: 'Кардиология',
      goal: '',
      requestedDate: '2030-01-10',
      requestedTime: '12:00',
      timezone: 'Europe/Moscow',
      durationMinutes: 60,
      format: 'online',
      price: 1000,
      status: 'accepted',
      studentMessage: '',
      tutorResponse: '',
      conversationId: [studentUid, tutorUid].sort().join('__'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await setDoc(doc(db, 'bookings', oldBookingId), {
      studentUid,
      studentName: 'Учебный Студент',
      studentAvatar: '',
      tutorUid,
      tutorName: 'Тест Репетитор',
      tutorAvatar: '',
      subject: 'Старое занятие',
      goal: '',
      requestedDate: '2025-01-10',
      requestedTime: '12:00',
      timezone: 'Europe/Moscow',
      durationMinutes: 60,
      format: 'online',
      price: 1000,
      status: 'completed',
      studentMessage: '',
      tutorResponse: '',
      conversationId: [studentUid, tutorUid].sort().join('__'),
      completedAt: oldCompletedAt,
      createdAt: oldCompletedAt,
      updatedAt: oldCompletedAt,
    })

    await setDoc(doc(db, 'whiteboards', oldBookingId, 'elements', 'old'), {
      id: 'old',
      kind: 'text',
      color: '#111827',
      size: 4,
      opacity: 1,
      authorUid: tutorUid,
      authorName: 'Тест Репетитор',
      points: [],
      x: 0.1,
      y: 0.1,
      endX: 0.1,
      endY: 0.1,
      text: 'Архивная запись',
      createdAtMs: oldCompletedAt.toMillis(),
      createdAt: oldCompletedAt,
      updatedAt: oldCompletedAt,
    })

    await setDoc(doc(db, 'medicalWorkspaces', bookingId), {
      bookingId,
      clinicalCase: {
        complaint: '',
        anamnesis: '',
        examination: '',
        diagnosis: '',
        differential: '',
        plan: '',
        teachingGoal: '',
      },
      labs: [],
      ecg: {
        rhythm: 'Синусовый',
        heartRate: '70',
        axis: 'Нормальная',
        prMs: '160',
        qrsMs: '90',
        qtMs: '380',
        qtcMs: '410',
        conclusion: '',
      },
      privacy: {
        deidentified: false,
        identifiersRemoved: false,
        consentConfirmed: false,
        educationalUseOnly: true,
        patientLabel: 'Учебный пациент',
      },
      boardBackground: {
        kind: 'none',
        assetId: '',
        label: '',
        anatomyLayer: 'organs',
        anatomyView: 'front',
        anatomyRegion: 'thorax',
      },
      updatedByUid: tutorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await uploadBytes(
      ref(
        context.storage(),
        `medical-workspaces/${oldBookingId}/${studentUid}/old.png`,
      ),
      new Uint8Array([137, 80, 78, 71]),
      { contentType: 'image/png' },
    )
  })
}

async function run() {
  await environment.clearFirestore()
  await environment.clearStorage()
  await seed()

  const student = environment.authenticatedContext(studentUid, {
    email: `${studentUid}@example.test`,
    email_verified: true,
  })
  const tutor = environment.authenticatedContext(tutorUid, {
    email: `${tutorUid}@example.test`,
    email_verified: true,
  })
  const newStudent = environment.authenticatedContext(newStudentUid, {
    email: `${newStudentUid}@example.test`,
    email_verified: true,
  })

  await assertFails(
    setDoc(
      doc(newStudent.firestore(), 'users', newStudentUid),
      profile(newStudentUid, 'student'),
    ),
  )

  const extraFieldProfile = {
    ...profile('medium-extra-user', 'student'),
    uid: 'medium-extra-user',
    email: 'medium-extra-user@example.test',
    unexpectedPrivilege: true,
  }
  const extraUser = environment.authenticatedContext('medium-extra-user', {
    email: 'medium-extra-user@example.test',
    email_verified: true,
  })
  await assertFails(
    setDoc(
      doc(extraUser.firestore(), 'users', 'medium-extra-user'),
      extraFieldProfile,
    ),
  )

  await assertFails(
    updateDoc(doc(student.firestore(), 'users', studentUid), {
      lessonPrice: 'бесплатно',
      updatedAt: serverTimestamp(),
    }),
  )

  await assertSucceeds(
    setDoc(doc(tutor.firestore(), 'availability', tutorUid), {
      tutorUid,
      timezone: 'Europe/Moscow',
      days: availabilityDays(),
      updatedAt: serverTimestamp(),
    }),
  )
  await assertFails(
    setDoc(doc(tutor.firestore(), 'availability', tutorUid), {
      tutorUid,
      timezone: 'Europe/Moscow',
      days: availabilityDays(availabilityDay(true, '25:00', '09:00')),
      updatedAt: serverTimestamp(),
    }),
  )

  await assertFails(
    setDoc(
      doc(tutor.firestore(), 'materials', 'unsafe-http'),
      material('http://example.test/material'),
    ),
  )
  await assertSucceeds(
    setDoc(
      doc(tutor.firestore(), 'materials', 'safe-https'),
      material('https://example.test/material'),
    ),
  )

  await assertFails(
    updateDoc(doc(tutor.firestore(), 'medicalWorkspaces', bookingId), {
      ecg: { unexpected: 'field' },
      updatedByUid: tutorUid,
      updatedAt: serverTimestamp(),
    }),
  )

  await assertFails(
    getDoc(
      doc(
        student.firestore(),
        'whiteboards',
        oldBookingId,
        'elements',
        'old',
      ),
    ),
  )
  await assertFails(
    getBytes(
      ref(
        student.storage(),
        `medical-workspaces/${oldBookingId}/${studentUid}/old.png`,
      ),
    ),
  )

  console.log('Medium Firebase security rules regression suite passed.')
}

try {
  await run()
} finally {
  await environment.cleanup()
}
