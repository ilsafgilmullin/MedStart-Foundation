'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  CalendarDays,
  Database,
  Download,
  FolderOpen,
  Eye,
  Gauge,
  KeyRound,
  Laptop,
  LoaderCircle,
  MailCheck,
  RefreshCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  TextCursorInput,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { resendEmailVerification, resetPassword } from '@/lib/auth'
import { updateUserProfile } from '@/lib/firestore'
import type { NotificationPreferences } from '@/lib/user-profile'
import {
  DEFAULT_UI_PREFERENCES,
  persistUiPreferences,
  readUiPreferences,
  type UiPreferences,
} from '@/lib/ui-preferences'

const defaults: NotificationPreferences = {
  bookingUpdates: true,
  newMessages: true,
  lessonReminders: true,
  productNews: false,
}

const timezoneOptions = [
  ['Europe/Kaliningrad', 'Калининград (UTC+2)'],
  ['Europe/Moscow', 'Москва (UTC+3)'],
  ['Europe/Samara', 'Самара (UTC+4)'],
  ['Asia/Yekaterinburg', 'Екатеринбург (UTC+5)'],
  ['Asia/Omsk', 'Омск (UTC+6)'],
  ['Asia/Krasnoyarsk', 'Красноярск (UTC+7)'],
  ['Asia/Irkutsk', 'Иркутск (UTC+8)'],
  ['Asia/Yakutsk', 'Якутск (UTC+9)'],
  ['Asia/Vladivostok', 'Владивосток (UTC+10)'],
  ['Asia/Magadan', 'Магадан (UTC+11)'],
  ['Asia/Kamchatka', 'Камчатка (UTC+12)'],
] as const

const switches: Array<{
  key: keyof NotificationPreferences
  title: string
  description: string
}> = [
  {
    key: 'bookingUpdates',
    title: 'Заявки и изменения занятий',
    description: 'Принятие, перенос, отклонение и отмена записи.',
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
    description: 'Редкие сообщения о важных новых возможностях.',
  },
]

function formatAccountDate(value?: string) {
  if (!value) return 'Нет данных'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Нет данных'
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function SettingsPage() {
  const { user, profile, role } = useAuth()
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(defaults)
  const [timezone, setTimezone] = useState('Europe/Moscow')
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(
    DEFAULT_UI_PREFERENCES,
  )
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setUiPreferences(readUiPreferences())
  }, [])

  useEffect(() => {
    if (!profile) return
    setPreferences({ ...defaults, ...profile.notificationPreferences })
    setTimezone(profile.timezone || 'Europe/Moscow')
  }, [profile])

  const accountFacts = useMemo(
    () => [
      {
        label: 'Аккаунт создан',
        value: formatAccountDate(user?.metadata.creationTime),
      },
      {
        label: 'Последний вход',
        value: formatAccountDate(user?.metadata.lastSignInTime),
      },
      {
        label: 'Основное устройство',
        value: 'Определяется автоматически при входе',
      },
    ],
    [user],
  )

  async function saveCloudSettings() {
    if (!user) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateUserProfile(user.uid, {
        notificationPreferences: preferences,
        timezone,
      })
      persistUiPreferences(uiPreferences)
      setMessage('Настройки аккаунта и интерфейса сохранены.')
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

  function exportProfile() {
    if (!profile) return
    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        uid: profile.uid,
        email: profile.email,
        role: profile.role,
        status: profile.status,
      },
      profileData: {
        name: profile.displayName,
        institution: profile.institution || '',
        fieldOfStudy: profile.fieldOfStudy || '',
        studyYear: profile.studyYear || '',
        subjects: profile.subjects || [],
        city: profile.city || '',
        timezone: profile.timezone || 'Europe/Moscow',
        lessonDuration: profile.lessonDuration || 60,
        lessonFormats: profile.lessonFormats || ['online'],
        bio: profile.bio || '',
        specialization: profile.specialization || '',
        professionalTitle: profile.title || '',
        experience: profile.experience || '',
        lessonPrice: profile.lessonPrice || 0,
        rating: profile.rating || 0,
        reviewsCount: profile.reviewsCount || 0,
        isPublic: profile.isPublic,
      },
      notificationPreferences: preferences,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `medstart-profile-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Копия данных профиля подготовлена.')
  }

  async function clearApplicationCache() {
    setBusyAction('cache')
    setError('')
    setMessage('')
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys()
        await Promise.all(
          keys
            .filter((key) => key.toLowerCase().includes('medstart'))
            .map((key) => window.caches.delete(key)),
        )
      }
      setMessage('Кэш приложения очищен. Личные настройки и данные сохранены.')
    } catch {
      setError('Не удалось очистить кэш на этом устройстве.')
    } finally {
      setBusyAction('')
    }
  }

  function changeUiPreference<K extends keyof UiPreferences>(
    key: K,
    value: UiPreferences[K],
  ) {
    const next = { ...uiPreferences, [key]: value }
    setUiPreferences(next)
    persistUiPreferences(next)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/15">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              {role === 'tutor' ? 'Рабочее пространство преподавателя' : 'Персональный MedStart'}
            </span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Настройки</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50/80 sm:text-base">
              {role === 'tutor'
                ? 'Настройте рабочее время, профессиональный профиль, уведомления, интерфейс и безопасность аккаунта.'
                : 'Управляйте расписанием, уведомлениями, удобством интерфейса и безопасностью аккаунта с одного экрана.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm">
            <p className="font-bold text-white">Текущий часовой пояс</p>
            <p className="mt-1 text-teal-50/75">
              {timezoneOptions.find(([value]) => value === timezone)?.[1] ||
                timezone}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {message}
        </div>
      )}

      {role === 'tutor' && profile && (
        <section className="rounded-[28px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-teal-700 shadow-sm ring-1 ring-teal-100">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Рабочие настройки репетитора</h2>
                  <p className="mt-1 text-sm text-slate-500">Ключевые параметры, которые видят студенты и использует расписание.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Статус анкеты</p>
                  <p className="mt-2 font-black text-slate-950">{profile.status === 'active' ? 'Опубликована' : profile.status === 'pending' ? 'На проверке' : 'Требует внимания'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Стоимость</p>
                  <p className="mt-2 font-black text-slate-950">{profile.lessonPrice ? `${profile.lessonPrice.toLocaleString('ru-RU')} ₽` : 'Не указана'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Длительность</p>
                  <p className="mt-2 font-black text-slate-950">{profile.lessonDuration ?? 60} минут</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Формат</p>
                  <p className="mt-2 font-black text-slate-950">{profile.lessonFormats?.includes('in_person') ? 'Онлайн и очно' : 'Онлайн'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/dashboard/profile" className="ms-btn ms-btn-primary ms-btn-sm">
              <Stethoscope className="h-4 w-4" />
              Профессиональный профиль
            </Link>
            <Link href="/dashboard/schedule" className="ms-btn ms-btn-secondary ms-btn-sm">
              <CalendarDays className="h-4 w-4" />
              Рабочие часы
            </Link>
            <Link href="/dashboard/materials" className="ms-btn ms-btn-secondary ms-btn-sm">
              <FolderOpen className="h-4 w-4" />
              Материалы
            </Link>
            <Link href="/dashboard/knowledge" className="ms-btn ms-btn-soft ms-btn-sm">
              <BookOpenCheck className="h-4 w-4" />
              Учебная база
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-teal-50 p-3 text-teal-700 ring-1 ring-teal-100">
            <Clock3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Время и расписание
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Часовой пояс используется в заявках, занятиях и напоминаниях.
            </p>
          </div>
        </div>
        <label className="mt-6 block max-w-xl space-y-2 text-sm font-bold text-slate-700">
          Часовой пояс
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
          >
            {timezoneOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700 ring-1 ring-cyan-100">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">Уведомления</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Выберите события, о которых MedStart должен сообщать.
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
                <p className="font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
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
                className="ms-switch shrink-0"
              >
                <span className="ms-switch-thumb" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-700 ring-1 ring-amber-100">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Интерфейс и доступность
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Эти параметры применяются сразу и сохраняются на текущем
              устройстве.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-teal-700" />
              <h3 className="font-black text-slate-900">Плотность кабинета</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              Компактный режим показывает больше информации на одном экране.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ['comfortable', 'Обычная'],
                ['compact', 'Компактная'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={uiPreferences.density === value}
                  onClick={() =>
                    changeUiPreference(
                      'density',
                      value as UiPreferences['density'],
                    )
                  }
                  className="ms-choice ms-choice-block"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <TextCursorInput className="h-5 w-5 text-teal-700" />
              <h3 className="font-black text-slate-900">Размер текста</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              Увеличенный текст полезен на телефоне и при долгой подготовке.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ['normal', 'Стандартный'],
                ['large', 'Увеличенный'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={uiPreferences.fontScale === value}
                  onClick={() =>
                    changeUiPreference(
                      'fontScale',
                      value as UiPreferences['fontScale'],
                    )
                  }
                  className="ms-choice ms-choice-block"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-5 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <RefreshCcw className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <div>
              <p className="font-black text-slate-900">Уменьшить анимацию</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Отключает интенсивные переходы и движение элементов.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={uiPreferences.reduceMotion}
            data-active={uiPreferences.reduceMotion}
            onClick={() =>
              changeUiPreference('reduceMotion', !uiPreferences.reduceMotion)
            }
            className="ms-switch shrink-0"
          >
            <span className="ms-switch-thumb" />
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-700 ring-1 ring-sky-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Безопасность аккаунта
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {profile?.email || 'Электронная почта не указана'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-teal-700" />
              <h3 className="font-black text-slate-900">Подтверждение почты</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              {user?.emailVerified
                ? 'Электронная почта подтверждена и защищает восстановление доступа.'
                : 'Подтвердите почту по ссылке из письма.'}
            </p>
            {!user?.emailVerified && (
              <button
                type="button"
                onClick={() => void verifyEmail()}
                disabled={Boolean(busyAction)}
                className="mt-4 ms-btn ms-btn-secondary ms-btn-sm"
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
              <KeyRound className="h-5 w-5 text-teal-700" />
              <h3 className="font-black text-slate-900">Пароль</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              Смена пароля выполняется через защищённую ссылку из письма.
            </p>
            <button
              type="button"
              onClick={() => void requestPasswordReset()}
              disabled={Boolean(busyAction)}
              className="mt-4 ms-btn ms-btn-secondary ms-btn-sm"
            >
              {busyAction === 'password' && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              Отправить ссылку
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 ring-1 ring-slate-200">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Данные и устройство
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Получите копию профиля или обновите локальные файлы приложения.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {accountFacts.map((item, index) => {
            const Icon = index === 2 ? Smartphone : Laptop
            return (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                <Icon className="h-5 w-5 text-teal-700" />
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-900">
                  {item.value}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={exportProfile}
            className="ms-btn ms-btn-secondary"
          >
            <Download className="h-5 w-5" />
            {role === 'tutor' ? 'Скачать профессиональные данные' : 'Скачать данные профиля'}
          </button>
          <button
            type="button"
            onClick={() => void clearApplicationCache()}
            disabled={Boolean(busyAction)}
            className="ms-btn ms-btn-soft"
          >
            {busyAction === 'cache' ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCcw className="h-5 w-5" />
            )}
            Обновить кэш приложения
          </button>
        </div>
      </section>

      <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex sm:justify-end">
        <button
          type="button"
          onClick={() => void saveCloudSettings()}
          disabled={saving}
          className="ms-btn ms-btn-primary ms-btn-block sm:w-auto"
        >
          {saving ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Сохранить настройки
        </button>
      </div>
    </div>
  )
}
