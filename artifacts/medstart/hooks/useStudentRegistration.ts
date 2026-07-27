'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FirebaseError } from 'firebase/app'
import { registerStudent } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

function messageFor(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/email-already-in-use')
      return 'Аккаунт с такой почтой уже существует.'
    if (error.code === 'auth/invalid-email')
      return 'Проверьте адрес электронной почты.'
    if (error.code === 'auth/weak-password')
      return 'Пароль должен содержать не менее 8 символов.'
  }
  return error instanceof Error ? error.message : 'Не удалось создать аккаунт.'
}

export function useStudentRegistration() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [field, setField] = useState('medicine')
  const [year, setYear] = useState('1')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password)
      return setError('Заполните обязательные поля.')
    if (password.length < 8)
      return setError('Пароль должен содержать не менее 8 символов.')
    if (password !== confirmPassword) return setError('Пароли не совпадают.')
    try {
      setLoading(true)
      await registerStudent({
        firstName,
        lastName,
        email,
        password,
        fieldOfStudy: field,
        studyYear: year,
      })
      router.replace(`${ROUTES.LOGIN}?registered=1`)
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setLoading(false)
    }
  }

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    field,
    setField,
    year,
    setYear,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    handleSubmit,
  }
}
