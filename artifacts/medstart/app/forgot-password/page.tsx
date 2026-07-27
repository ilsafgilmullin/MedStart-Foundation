'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { resetPassword } from '@/lib/auth'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:text-sm'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSent(false)

    try {
      setLoading(true)
      await resetPassword(email)
      setSent(true)
    } catch (caught) {
      if (caught instanceof FirebaseError) {
        if (caught.code === 'auth/invalid-email') setError('Некорректный адрес почты.')
        else if (caught.code === 'auth/too-many-requests')
          setError('Слишком много запросов. Повторите позже.')
        else setError('Не удалось отправить письмо. Повторите позже.')
      } else {
        setError('Не удалось отправить письмо. Повторите позже.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="text-xl font-bold text-violet-700">
          MedStart
        </Link>
        <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Восстановление пароля</h1>
          <p className="mt-2 text-slate-500">
            Укажите почту аккаунта. Firebase отправит ссылку для создания нового пароля.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block space-y-2 text-sm font-medium">
              Электронная почта
              <input
                type="email"
                autoComplete="email"
                required
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {sent && (
              <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                Письмо отправлено. Проверьте «Входящие» и «Спам» на Яндекс Почте.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Отправляем…' : 'Отправить письмо'}
            </button>
          </form>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-violet-700">
            Вернуться ко входу
          </Link>
        </div>
      </div>
    </main>
  )
}
