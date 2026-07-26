import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { PRIMARY_OWNER_UID } from './access-control'
import type {
  LessonFormat,
  NotificationPreferences,
  TutorPrivateProfile,
  UserProfile,
  UserRole,
  UserStatus,
} from './user-profile'

export interface CreateUserProfileParams {
  uid: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  status: UserStatus
  avatar?: string
  fieldOfStudy?: string
  studyYear?: string
  title?: string
  specialization?: string
  subjects?: string[]
  institution?: string
  experience?: string
  bio?: string
  city?: string
  lessonPrice?: number
  lessonDuration?: number
  lessonFormats?: LessonFormat[]
  timezone?: string
  notificationPreferences?: NotificationPreferences
  isPublic?: boolean
  onboardingCompleted?: boolean
}

export type TutorModerationDecision = 'approve' | 'reject'

export interface AdminOverview {
  totalUsers: number
  studentsCount: number
  activeTutorsCount: number
  rejectedTutorsCount: number
  blockedUsersCount: number
  pendingTutors: UserProfile[]
  users: UserProfile[]
  tutorPrivateProfiles: Record<string, TutorPrivateProfile>
}

const clean = (value: string | undefined) => value?.trim() || ''
const cleanList = (items: string[] | undefined) => [
  ...new Set((items ?? []).map((item) => item.trim()).filter(Boolean)),
]

const protectedProfileFields = new Set<keyof UserProfile>([
  'uid',
  'email',
  'role',
  'status',
  'statusBeforeBlock',
  'rating',
  'reviewsCount',
  'isPublic',
  'moderationNote',
  'moderatedBy',
  'moderatedAt',
  'createdAt',
])

function sortTutors(items: UserProfile[]) {
  return [...items].sort((left, right) => {
    const ratingDifference = (right.rating ?? 0) - (left.rating ?? 0)
    return (
      ratingDifference ||
      left.displayName.localeCompare(right.displayName, 'ru')
    )
  })
}

function publicTutorsQuery() {
  return query(
    collection(db, 'users'),
    where('role', '==', 'tutor'),
    where('status', '==', 'active'),
    where('isPublic', '==', true),
  )
}

function buildAdminOverview(
  profiles: UserProfile[],
  tutorPrivateProfiles: Record<string, TutorPrivateProfile>,
): AdminOverview {
  return {
    totalUsers: profiles.length,
    studentsCount: profiles.filter(
      (profile) =>
        profile.uid !== PRIMARY_OWNER_UID &&
        profile.role === 'student' &&
        profile.status === 'active',
    ).length,
    activeTutorsCount: profiles.filter(
      (profile) =>
        profile.role === 'tutor' &&
        profile.status === 'active' &&
        profile.isPublic,
    ).length,
    rejectedTutorsCount: profiles.filter(
      (profile) => profile.role === 'tutor' && profile.status === 'rejected',
    ).length,
    blockedUsersCount: profiles.filter(
      (profile) => profile.status === 'blocked',
    ).length,
    pendingTutors: profiles
      .filter(
        (profile) => profile.role === 'tutor' && profile.status === 'pending',
      )
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, 'ru'),
      ),
    users: [...profiles].sort((left, right) =>
      left.displayName.localeCompare(right.displayName, 'ru'),
    ),
    tutorPrivateProfiles,
  }
}

export async function createUserProfile(
  input: CreateUserProfileParams,
): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: input.uid,
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    displayName: `${clean(input.firstName)} ${clean(input.lastName)}`.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    status: input.status,
    avatar: clean(input.avatar),
    fieldOfStudy: clean(input.fieldOfStudy),
    studyYear: clean(input.studyYear),
    title: clean(input.title),
    specialization: clean(input.specialization),
    subjects: cleanList(input.subjects),
    institution: clean(input.institution),
    experience: clean(input.experience),
    bio: clean(input.bio),
    city: clean(input.city),
    lessonPrice: Math.max(0, input.lessonPrice ?? 0),
    lessonDuration: Math.max(30, input.lessonDuration ?? 60),
    lessonFormats: input.lessonFormats?.length
      ? [...new Set(input.lessonFormats)]
      : ['online'],
    timezone: clean(input.timezone) || 'Europe/Moscow',
    rating: 0,
    reviewsCount: 0,
    isPublic: input.isPublic ?? false,
    notificationPreferences: input.notificationPreferences ?? {
      bookingUpdates: true,
      newMessages: true,
      lessonReminders: true,
      productNews: false,
    },
    onboardingCompleted: input.onboardingCompleted ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'users', input.uid), profile)
  return profile
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null
}

export function subscribeToUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) =>
      onChange(snapshot.exists() ? (snapshot.data() as UserProfile) : null),
    onError,
  )
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<UserProfile>,
) {
  const safePatch = Object.fromEntries(
    Object.entries(patch).filter(
      ([key, value]) =>
        value !== undefined &&
        !protectedProfileFields.has(key as keyof UserProfile),
    ),
  ) as Partial<UserProfile>

  await updateDoc(doc(db, 'users', uid), {
    ...safePatch,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteUserProfile(uid: string) {
  await deleteDoc(doc(db, 'users', uid))
}

export async function getPublicTutors(): Promise<UserProfile[]> {
  const snapshot = await getDocs(publicTutorsQuery())
  return sortTutors(snapshot.docs.map((item) => item.data() as UserProfile))
}

export async function getPublicTutor(
  tutorUid: string,
): Promise<UserProfile | null> {
  const profile = await getUserProfile(tutorUid)
  return profile?.role === 'tutor' &&
    profile.status === 'active' &&
    profile.isPublic
    ? profile
    : null
}

export function subscribeToPublicTutors(
  onChange: (profiles: UserProfile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    publicTutorsQuery(),
    (snapshot) =>
      onChange(
        sortTutors(snapshot.docs.map((item) => item.data() as UserProfile)),
      ),
    onError,
  )
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [snapshot, privateSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'tutorPrivateProfiles')),
  ])
  const tutorPrivateProfiles = Object.fromEntries(
    privateSnapshot.docs.map((item) => [
      item.id,
      item.data() as TutorPrivateProfile,
    ]),
  )
  return buildAdminOverview(
    snapshot.docs.map((item) => item.data() as UserProfile),
    tutorPrivateProfiles,
  )
}

export async function moderateTutor(
  tutorUid: string,
  moderatorUid: string,
  decision: TutorModerationDecision,
  note = '',
): Promise<void> {
  const tutorRef = doc(db, 'users', tutorUid)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(tutorRef)
    if (!snapshot.exists()) {
      throw new Error('Анкета репетитора не найдена.')
    }

    const profile = snapshot.data() as UserProfile
    if (profile.role !== 'tutor') {
      throw new Error('Выбранный профиль не является профилем репетитора.')
    }
    if (profile.status !== 'pending') {
      throw new Error('Эта анкета уже была обработана.')
    }

    transaction.update(tutorRef, {
      status: decision === 'approve' ? 'active' : 'rejected',
      isPublic: decision === 'approve',
      moderationNote: decision === 'reject' ? note.trim() : '',
      moderatedBy: moderatorUid,
      moderatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
}

export async function resubmitTutorProfile(uid: string): Promise<void> {
  const tutorRef = doc(db, 'users', uid)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(tutorRef)
    if (!snapshot.exists()) {
      throw new Error('Профиль репетитора не найден.')
    }

    const profile = snapshot.data() as UserProfile
    if (profile.role !== 'tutor' || profile.status !== 'rejected') {
      throw new Error('Эту анкету нельзя повторно отправить на проверку.')
    }

    transaction.update(tutorRef, {
      status: 'pending',
      isPublic: false,
      moderationNote: '',
      moderatedBy: '',
      moderatedAt: null,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function getTutorPrivateProfile(
  tutorUid: string,
): Promise<TutorPrivateProfile | null> {
  const snapshot = await getDoc(doc(db, 'tutorPrivateProfiles', tutorUid))
  return snapshot.exists() ? (snapshot.data() as TutorPrivateProfile) : null
}

export async function updateTutorPrivateProfile(
  tutorUid: string,
  qualificationReference: string,
): Promise<void> {
  await setDoc(
    doc(db, 'tutorPrivateProfiles', tutorUid),
    {
      tutorUid,
      qualificationReference: qualificationReference.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  await updateDoc(doc(db, 'users', tutorUid), {
    licenceNumber: deleteField(),
    updatedAt: serverTimestamp(),
  })
}

export async function setUserBlocked(
  targetUid: string,
  blocked: boolean,
): Promise<void> {
  if (targetUid === PRIMARY_OWNER_UID) {
    throw new Error('Аккаунт владельца нельзя заблокировать.')
  }

  const targetRef = doc(db, 'users', targetUid)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(targetRef)
    if (!snapshot.exists()) throw new Error('Пользователь не найден.')
    const profile = snapshot.data() as UserProfile

    if (blocked) {
      if (profile.status === 'blocked' || profile.status === 'deleted') {
        throw new Error('Этот аккаунт уже недоступен.')
      }
      transaction.update(targetRef, {
        statusBeforeBlock: profile.status,
        status: 'blocked',
        isPublic: false,
        updatedAt: serverTimestamp(),
      })
      return
    }

    if (profile.status !== 'blocked') {
      throw new Error('Аккаунт не заблокирован.')
    }
    const restoredStatus =
      profile.statusBeforeBlock &&
      ['active', 'pending', 'rejected'].includes(profile.statusBeforeBlock)
        ? profile.statusBeforeBlock
        : 'active'
    transaction.update(targetRef, {
      status: restoredStatus,
      statusBeforeBlock: '',
      isPublic: profile.role === 'tutor' && restoredStatus === 'active',
      updatedAt: serverTimestamp(),
    })
  })
}

export async function setUserAdmin(
  targetUid: string,
  enabled: boolean,
): Promise<void> {
  if (targetUid === PRIMARY_OWNER_UID) {
    throw new Error('Роль владельца закреплена отдельно.')
  }

  const targetRef = doc(db, 'users', targetUid)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(targetRef)
    if (!snapshot.exists()) throw new Error('Пользователь не найден.')
    const profile = snapshot.data() as UserProfile

    if (profile.status !== 'active') {
      throw new Error('Сначала активируйте аккаунт пользователя.')
    }
    if (enabled && profile.role !== 'student') {
      throw new Error('Администратором можно назначить активного студента.')
    }
    if (!enabled && profile.role !== 'admin') {
      throw new Error('Этот пользователь не является администратором.')
    }

    transaction.update(targetRef, {
      role: enabled ? 'admin' : 'student',
      isPublic: false,
      updatedAt: serverTimestamp(),
    })
  })
}
