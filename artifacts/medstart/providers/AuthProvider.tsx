'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getUserProfile,
  subscribeToUserProfile,
  updateUserProfile,
} from '@/lib/firestore'
import { isOwnerUid, logout as performLogout } from '@/lib/auth'
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

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeProfile?.()
      unsubscribeProfile = undefined
      setLoading(true)
      setUser(currentUser)

      if (!currentUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      unsubscribeProfile = subscribeToUserProfile(
        currentUser.uid,
        (nextProfile) => {
          setProfile(nextProfile)
          setLoading(false)
          if (
            nextProfile &&
            isOwnerUid(currentUser.uid) &&
            nextProfile.firstName.trim().toLocaleLowerCase('ru-RU') === 'олег'
          ) {
            const firstName = 'Ильсаф'
            const lastName = nextProfile.lastName.trim()
            void updateUserProfile(currentUser.uid, {
              firstName,
              displayName: `${firstName} ${lastName}`.trim(),
            })
          }
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
