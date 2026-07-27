'use client'

import { useEffect, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  MailCheck,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { resendEmailVerification, resetPassword } from '@/lib/auth'
import { updateUserProfile } from '@/lib/firestore'
import type { NotificationPreferences } from '@/lib/user-profile'

const defaults: NotificationPreferences = {
  bookingUpdates: true,
  newMessages: true,
  lessonReminders: true,
  productNews: false,
}

const switches: Array<{
  key: keyof NotificationPreferences
  title: string
  description: string
}> = [
  {
    key: 'bookingUpdates',
    title: 'Заявки и изменения занятий',
    description: 'Принятие, отклонение и отмена записи.',
  },
  {
    key: 'newMessages',
    title: 'Новые сообщения',
    description: 'Уведомления о сообщениях в личных диалогах.',
  },
  {
    key: 'lessonReminders',
    title: 'Напоминания о занятиях',
    description: 'Напомнить перед подтверждённым занятием.',
  },
  {
    key: 'productNews',
    title: 'Новости MedStart',
    description: 'Редкие сообщения о новых возможностях платформы.',
  },
]

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(defaults)
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile?.notificationPreferences) {
      setPreferences({ ...defaults, ...profile.notificationPreferences })
    }
  }, [profile])

  async function save() {
    if (!user) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateUserProfile(user.uid, {
        notificationPreferences: preferences,
      })
      setMessage('Настройки уведомлений сохранены.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось сохранить настройки.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function verifyEmail() {
    setBusyAction('verify')
    setError('')
    setMessage('')
    try {
      await resendEmailVerification()
      setMessage('Письмо для подтверждения отправлено повторно.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось отправить письмо.',
      )
    } finally {
      setBusyAction('')
    }
  }

  async function requestPasswordReset() {
    if (!profile?.email) return
    setBusyAction('password')
    setError('')
    setMessage('')
    try {
      await resetPassword(profile.email)
      setMessage('Ссылка для смены пароля отправлена на вашу почту.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось отправить письмо.',
      )
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
        <p className="mt-2 text-slate-500">
          Управляйте уведомлениями и безопасностью аккаунта.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          {message}
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Уведомления</h2>
            <p className="text-sm text-slate-500">
              Предпочтения сохраняются в вашем профиле.
            </p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-slate-100">
          {switches.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences[item.key]}
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    [item.key]: !current[item.key],
                  }))
                }
                data-active={preferences[item.key]}
                className="ms-switch"
              >
                <span
                  className="ms-switch-thumb"
                />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-6 ms-btn ms-btn-primary ms-btn-block sm:w-auto"
        >
          {saving ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Сохранить настройки
        </button>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Безопасность аккаунта
            </h2>
            <p className="text-sm text-slate-500">
              {profile?.email || 'Электронная почта не указана'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-violet-600" />
              <h3 className="font-bold text-slate-800">Подтверждение почты</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {user?.emailVerified
                ? 'Электронная почта подтверждена.'
                : 'Подтвердите почту по ссылке из письма.'}
            </p>
            {!user?.emailVerified && (
              <button
                type="button"
                onClick={() => void verifyEmail()}
                disabled={Boolean(busyAction)}
                className="mt-4 ms-link-action text-sm disabled:opacity-60"
              >
                {busyAction === 'verify' && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Отправить письмо снова
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-violet-600" />
              <h3 className="font-bold text-slate-800">Пароль</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Смена пароля выполняется через защищённую ссылку из письма.
            </p>
            <button
              type="button"
              onClick={() => void requestPasswordReset()}
              disabled={Boolean(busyAction)}
              className="mt-4 ms-link-action text-sm disabled:opacity-60"
            >
              {busyAction === 'password' && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              Отправить ссылку
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
