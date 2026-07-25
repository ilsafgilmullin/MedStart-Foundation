'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LogOut, Mail, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { resetPassword } from '@/lib/auth'

export default function SettingsPage() {
  const router = useRouter()
  const { profile, logout } = useAuth()
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function sendReset() {
    if (!profile?.email) return

    setMessage('')
    setError('')

    try {
      setSending(true)
      await resetPassword(profile.email)
      setMessage('Письмо для смены пароля отправлено на вашу почту.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось отправить письмо для смены пароля.',
      )
    } finally {
      setSending(false)
    }
  }

  async function exit() {
    await logout()
    router.replace('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
        <p className="mt-2 text-slate-500">
          Управление безопасностью и доступом к аккаунту.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Электронная почта
          </h2>
          <p className="mt-2 text-slate-500">
            {profile?.email || 'Адрес не указан'}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Адрес связан с Firebase Authentication. Его изменение будет подключено отдельным безопасным сценарием.
          </p>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Безопасность
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Для смены пароля отправим официальную ссылку Firebase на электронную почту аккаунта.
          </p>
          <button
            type="button"
            onClick={sendReset}
            disabled={sending || !profile?.email}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {sending ? 'Отправляем…' : 'Сменить пароль'}
          </button>
        </section>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[32px] border border-red-100 bg-white p-7 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Завершить сеанс</h2>
        <p className="mt-2 text-sm text-slate-500">
          На этом устройстве потребуется снова ввести данные для входа.
        </p>
        <button
          type="button"
          onClick={exit}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-red-200 px-5 py-3 font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Выйти из аккаунта
        </button>
      </section>
    </div>
  )
}
