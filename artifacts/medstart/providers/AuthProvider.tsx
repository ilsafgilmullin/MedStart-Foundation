'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'

import { auth } from '@/lib/firebase'
import { getUserProfile } from '@/lib/firestore'
import { isOwnerUid, logout as performLogout } from '@/lib/auth'
import type { EffectiveUserRole, UserProfile } from '@/lib/user-profile'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  role: EffectiveUserRole | null
  loading: boolean
  error: string | null
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async (uid: string) => {
    const nextProfile = await getUserProfile(uid)
    setProfile(nextProfile)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null)
      return
    }

    await loadProfile(auth.currentUser.uid)
  }, [loadProfile])

  useEffect(() => {
    let active = true

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return

      setLoading(true)
      setError(null)
      setUser(currentUser)

      try {
        if (currentUser) {
          const nextProfile = await getUserProfile(currentUser.uid)
          if (active) setProfile(nextProfile)
        } else {
          setProfile(null)
        }
      } catch (caught) {
        if (!active) return
        setProfile(null)
        setError(
          caught instanceof Error
            ? caught.message
            : 'Не удалось загрузить профиль пользователя.',
        )
      } finally {
        if (active) setLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const role: EffectiveUserRole | null =
    user && isOwnerUid(user.uid) ? 'owner' : profile?.role ?? null

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role,
      loading,
      error,
      logout: performLogout,
      refreshProfile,
    }),
    [user, profile, role, loading, error, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuthContext must be used inside AuthProvider')
  }

  return value
}
