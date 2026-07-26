/**
 * The primary owner is pinned by Firebase Authentication UID.
 *
 * A public UID is an identifier, not a secret. Firestore rules contain the
 * same value and remain the source of truth for privileged database writes.
 * Change both places together if ownership is transferred in the future.
 */
export const PRIMARY_OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'

export function isOwnerUid(uid: string | null | undefined): boolean {
  return Boolean(uid) && uid === PRIMARY_OWNER_UID
}
