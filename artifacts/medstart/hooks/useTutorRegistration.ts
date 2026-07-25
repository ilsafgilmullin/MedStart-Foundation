'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FirebaseError } from 'firebase/app'
import { registerTutor } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

export function useTutorRegistration() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [institution, setInstitution] = useState('')
  const [experience, setExperience] = useState('')
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !specialization.trim() || !password) return setError('Заполните обязательные поля.')
    if (password.length < 8) return setError('Пароль должен содержать не менее 8 символов.')
    if (password !== confirmPassword) return setError('Пароли не совпадают.')
    try {
      setLoading(true)
      await registerTutor({ firstName, lastName, email, specialization, institution, experience, bio, password })
      router.replace(ROUTES.DASHBOARD)
    } catch (caught) {
      if (caught instanceof FirebaseError && caught.code === 'auth/email-already-in-use') setError('Аккаунт с такой почтой уже существует.')
      else setError(caught instanceof Error ? caught.message : 'Не удалось создать профиль репетитора.')
    } finally {
      setLoading(false)
    }
  }

  return { firstName, setFirstName, lastName, setLastName, email, setEmail, specialization, setSpecialization, institution, setInstitution, experience, setExperience, bio, setBio, password, setPassword, confirmPassword, setConfirmPassword, loading, error, handleSubmit }
}
