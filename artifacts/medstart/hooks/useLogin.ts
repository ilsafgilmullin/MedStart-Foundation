'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FirebaseError } from 'firebase/app'

import { login } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

export function useLogin() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError('')

    if (!email || !password) {
      setError('Заполните все поля.')
      return
    }

    try {
      setLoading(true)

      await login(email, password)

      router.push(ROUTES.DASHBOARD)
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setError('Неверный email или пароль.')
            break

          case 'auth/invalid-email':
            setError('Некорректный email.')
            break

          case 'auth/too-many-requests':
            setError('Слишком много попыток входа. Попробуйте позже.')
            break

          default:
            setError('Не удалось выполнить вход.')
        }
      } else {
        setError('Произошла неизвестная ошибка.')
      }
    } finally {
      setLoading(false)
    }
  }

  return {
    email,
    setEmail,

    password,
    setPassword,

    loading,
    error,

    handleSubmit,
  }
}
