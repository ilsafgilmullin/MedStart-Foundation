from __future__ import annotations

from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


rules_path = Path("firestore.secure.rules")
rules = rules_path.read_text()
rules = replace_once(
    rules,
    """    function signedIn() {
      return request.auth != null;
    }
""",
    """    function signedIn() {
      return request.auth != null
        && request.auth.token.email_verified == true;
    }
""",
    "verified Firestore session",
)
rules = replace_once(
    rules,
    """    function isOwnProfile(userId) {
      return signedIn() && request.auth.uid == userId;
    }
""",
    """    function isOwnProfile(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
""",
    "unverified registration identity",
)
rules = replace_once(
    rules,
    """      allow get: if isModerator() || isOwnProfile(userId) || isPublicTutorResource();
""",
    """      allow get: if isModerator()
        || (signedIn() && isOwnProfile(userId))
        || isPublicTutorResource();
""",
    "verified profile read",
)
rules = replace_once(
    rules,
    """          isOwnProfile(userId)
          && userExists(userId)
""",
    """          signedIn()
          && isOwnProfile(userId)
          && userExists(userId)
""",
    "verified profile update",
)
rules_path.write_text(rules)

storage_path = Path("storage.rules")
storage = storage_path.read_text()
storage = replace_once(
    storage,
    """    function signedIn() {
      return request.auth != null;
    }
""",
    """    function signedIn() {
      return request.auth != null
        && request.auth.token.email_verified == true;
    }
""",
    "verified Storage session",
)
storage_path.write_text(storage)

livekit_path = Path("artifacts/medstart/app/api/livekit/token/route.ts")
livekit = livekit_path.read_text()
livekit = replace_once(
    livekit,
    """    const decoded = await getFirebaseAdminAuth().verifyIdToken(
      authorization.slice('Bearer '.length),
      true,
    )
    const database = getFirebaseAdminDb()
""",
    """    const decoded = await getFirebaseAdminAuth().verifyIdToken(
      authorization.slice('Bearer '.length),
      true,
    )
    if (!decoded.email_verified) {
      return jsonError('Подтвердите электронную почту перед входом в занятие.', 403)
    }
    const database = getFirebaseAdminDb()
""",
    "LiveKit verified email",
)
livekit_path.write_text(livekit)

test_path = Path("scripts/test-critical-rules.mjs")
test = test_path.read_text()
test = replace_once(
    test,
    """  const blocked = environment.authenticatedContext(blockedUid, {
    email: `${blockedUid}@example.test`,
    email_verified: true,
  })

  await assertSucceeds(getDoc(doc(student.firestore(), 'bookings', bookingId)))
""",
    """  const blocked = environment.authenticatedContext(blockedUid, {
    email: `${blockedUid}@example.test`,
    email_verified: true,
  })
  const unverifiedStudent = environment.authenticatedContext(studentUid, {
    email: `${studentUid}@example.test`,
    email_verified: false,
  })

  await assertSucceeds(getDoc(doc(student.firestore(), 'bookings', bookingId)))
""",
    "unverified test context",
)
test = replace_once(
    test,
    """  await assertFails(
    getBytes(
      ref(
        blocked.storage(),
        `medical-workspaces/${bookingId}/${studentUid}/seed.png`,
      ),
    ),
  )

  await assertFails(
""",
    """  await assertFails(
    getBytes(
      ref(
        blocked.storage(),
        `medical-workspaces/${bookingId}/${studentUid}/seed.png`,
      ),
    ),
  )

  await assertFails(
    getDoc(doc(unverifiedStudent.firestore(), 'users', studentUid)),
  )
  await assertFails(
    getDoc(doc(unverifiedStudent.firestore(), 'bookings', bookingId)),
  )
  await assertFails(
    getDoc(
      doc(unverifiedStudent.firestore(), 'conversations', conversationId),
    ),
  )
  await assertFails(
    getDoc(
      doc(
        unverifiedStudent.firestore(),
        'whiteboards',
        bookingId,
        'elements',
        'seed',
      ),
    ),
  )
  await assertFails(
    getBytes(
      ref(
        unverifiedStudent.storage(),
        `medical-workspaces/${bookingId}/${studentUid}/seed.png`,
      ),
    ),
  )

  await assertFails(
""",
    "unverified access assertions",
)
test_path.write_text(test)
