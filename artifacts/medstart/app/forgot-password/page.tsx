'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { MailCheck } from 'lucide-react'
import { resetPassword } from '@/lib/auth'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:text-sm'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const requestedEmail = new URLSearchParams(window.location.search).get('email')
    if (requestedEmail) setEmail(requestedEmail.trim().toLowerCase())
  }, [])

  async function requestReset() {
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Введите адрес электронной почты.')
      return
    }

    try {
      setLoading(true)
      await resetPassword(normalizedEmail)
      setEmail(normalizedEmail)
      setSent(true)
    } catch (caught) {
      if (caught instanceof FirebaseError) {
        switch (caught.code) {
          case 'auth/invalid-email':
          case 'auth/missing-email':
            setError('Некорректный адрес электронной почты.')
            break
          case 'auth/too-many-requests':
            setError('Слишком много запросов. Подождите и повторите позже.')
            break
          case 'auth/network-request-failed':
            setError('Не удалось связаться с сервером. Проверьте интернет и повторите.')
            break
          case 'auth/user-not-found':
            // Do not reveal whether a particular address is registered.
            setSent(true)
            break
          case 'auth/operation-not-allowed':
            setError('Восстановление пароля временно отключено в Firebase.')
            break
          case 'auth/unauthorized-continue-uri':
          case 'auth/unauthorized-domain':
            setError('Firebase отклонил адрес возврата. Обновите страницу и повторите отправку.')
            break
          default:
            setError(`Не удалось отправить письмо (${caught.code}). Повторите позже.`)
        }
      } else {
        setError('Не удалось отправить письмо. Повторите позже.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void requestReset()
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        <Link href="/" className="text-xl font-bold text-violet-700">
          MedStart
        </Link>
        <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Восстановление пароля</h1>
          <p className="mt-2 leading-6 text-slate-500">
            Укажите почту аккаунта. Firebase отправит защищённую ссылку для создания нового пароля.
          </p>

          {sent ? (
            <div className="mt-8" aria-live="polite">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <div className="flex items-start gap-3">
                  <MailCheck className="mt-0.5 h-6 w-6 shrink-0" />
                  <div>
                    <h2 className="font-semibold">Запрос принят Firebase</h2>
                    <p className="mt-2 text-sm leading-6">
                      Если аккаунт с адресом <strong>{email.trim()}</strong> существует, письмо отправлено.
                    </p>
                  </div>
                </div>
              </div>
              <ol className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                <li>1. Откройте самое новое письмо от MedStart или Firebase.</li>
                <li>2. Нажмите ссылку и задайте новый пароль.</li>
                <li>3. Вернитесь в MedStart и войдите с новым паролем.</li>
              </ol>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Проверьте папки «Спам» и «Рассылки». После повторной отправки используйте только последнее письмо.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void requestReset()}
                className="mt-5 w-full rounded-2xl border border-violet-200 px-5 py-3.5 font-semibold text-violet-700 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Отправляем…' : 'Отправить письмо ещё раз'}
              </button>
              {error && (
                <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <label className="block space-y-2 text-sm font-medium">
                Электронная почта
                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'reset-error' : undefined}
                  className={inputClass}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              {error && (
                <p
                  id="reset-error"
                  role="alert"
                  className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Отправляем…' : 'Получить ссылку'}
              </button>
            </form>
          )}

          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-violet-700">
            Вернуться ко входу
          </Link>
        </div>
      </div>
    </main>
  )
}
