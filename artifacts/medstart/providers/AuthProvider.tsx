'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onIdTokenChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getUserProfile,
  subscribeToUserProfile,
} from '@/lib/firestore'
import {
  isAuthTransitionInProgress,
  isOwnerUid,
  logout as performLogout,
} from '@/lib/auth'
import type { EffectiveUserRole, UserProfile } from '@/lib/user-profile'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  role: EffectiveUserRole | null
  loading: boolean
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (uid: string) =>
    setProfile(await getUserProfile(uid))
  const refreshProfile = async () => {
    if (auth.currentUser) await loadProfile(auth.currentUser.uid)
  }

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined
    let revokingAccess = false

    const revokeSession = () => {
      setProfile(null)
      setUser(null)
      setLoading(false)
      unsubscribeProfile?.()
      unsubscribeProfile = undefined
      if (!revokingAccess) {
        revokingAccess = true
        void performLogout()
      }
    }

    const unsubscribeAuth = onIdTokenChanged(auth, (currentUser) => {
      unsubscribeProfile?.()
      unsubscribeProfile = undefined
      setLoading(true)
      setUser(currentUser)

      if (!currentUser) {
        setProfile(null)
        setLoading(false)
        revokingAccess = false
        return
      }

      if (!currentUser.emailVerified) {
        setProfile(null)

        // Login and registration briefly create an unverified session. During
        // that protected transition we keep loading until auth.ts either signs
        // out or reloads the verified user and refreshes the ID token. The
        // resulting token event then resumes profile loading without a redirect
        // loop or a false anonymous state.
        if (isAuthTransitionInProgress()) return

        revokeSession()
        return
      }

      revokingAccess = false
      unsubscribeProfile = subscribeToUserProfile(
        currentUser.uid,
        (nextProfile) => {
          if (
            nextProfile?.status === 'blocked' ||
            nextProfile?.status === 'deleted'
          ) {
            revokeSession()
            return
          }

          setProfile(nextProfile)
          setLoading(false)
        },
        () => {
          setProfile(null)
          setLoading(false)
        },
      )
    })

    return () => {
      unsubscribeProfile?.()
      unsubscribeAuth()
    }
  }, [])

  const role: EffectiveUserRole | null =
    user && isOwnerUid(user.uid) ? 'owner' : (profile?.role ?? null)
  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      loading,
      logout: performLogout,
      refreshProfile,
    }),
    [user, profile, role, loading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuthContext must be used inside AuthProvider')
  return value
}
