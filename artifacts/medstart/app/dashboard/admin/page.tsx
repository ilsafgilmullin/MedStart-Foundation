'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  CircleCheck,
  Clock3,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import {
  getAdminOverview,
  moderateTutor,
  setUserAdmin,
  setUserBlocked,
  type AdminOverview,
  type TutorModerationDecision,
} from '@/lib/firestore'
import { PRIMARY_OWNER_UID } from '@/lib/access-control'
import type { UserProfile } from '@/lib/user-profile'

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Не удалось выполнить действие. Попробуйте ещё раз.'
  }

  if (
    error.message.includes('permission-denied') ||
    error.message.includes('Missing or insufficient permissions')
  ) {
    return 'Firebase отклонил доступ. Необходимо опубликовать новые правила Firestore.'
  }

  return error.message
}

function initials(profile: UserProfile) {
  return (
    `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() ||
    'Р'
  )
}

export default function AdminPage() {
  const { role, user } = useAuth()
  const allowed = role === 'admin' || role === 'owner'
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyUid, setBusyUid] = useState<string | null>(null)
  const [rejectingUid, setRejectingUid] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!allowed) {
        setLoading(false)
        return
      }

      if (!silent) setLoading(true)
      setError('')
      try {
        setOverview(await getAdminOverview())
      } catch (loadError) {
        setError(errorMessage(loadError))
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [allowed],
  )

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6" />
          <div>
            <h1 className="font-bold">Доступ запрещён</h1>
            <p className="mt-1 text-sm">
              Этот раздел доступен только владельцу и администраторам.
            </p>
          </div>
        </div>
      </div>
    )
  }

  async function applyDecision(
    tutor: UserProfile,
    decision: TutorModerationDecision,
  ) {
    if (!user) return

    const note = rejectionReason.trim()
    if (decision === 'reject' && note.length < 3) {
      setError('Укажите короткую причину отклонения анкеты.')
      return
    }

    if (
      decision === 'approve' &&
      !window.confirm(
        `Одобрить анкету «${tutor.displayName}» и опубликовать её в каталоге?`,
      )
    ) {
      return
    }

    setBusyUid(tutor.uid)
    setError('')
    setMessage('')

    try {
      await moderateTutor(tutor.uid, user.uid, decision, note)
      setMessage(
        decision === 'approve'
          ? `${tutor.displayName}: анкета одобрена и опубликована в каталоге.`
          : `${tutor.displayName}: анкета отклонена.`,
      )
      setRejectingUid(null)
      setRejectionReason('')
      await loadOverview(true)
    } catch (actionError) {
      setError(errorMessage(actionError))
    } finally {
      setBusyUid(null)
    }
  }

  async function toggleBlocked(profile: UserProfile) {
    const nextBlocked = profile.status !== 'blocked'
    if (
      !window.confirm(
        nextBlocked
          ? `Заблокировать аккаунт «${profile.displayName}»?`
          : `Восстановить доступ для «${profile.displayName}»?`,
      )
    ) {
      return
    }

    setBusyUid(profile.uid)
    setError('')
    setMessage('')
    try {
      await setUserBlocked(profile.uid, nextBlocked)
      setMessage(
        nextBlocked
          ? `${profile.displayName}: доступ заблокирован.`
          : `${profile.displayName}: доступ восстановлен.`,
      )
      await loadOverview(true)
    } catch (actionError) {
      setError(errorMessage(actionError))
    } finally {
      setBusyUid(null)
    }
  }

  async function toggleAdmin(profile: UserProfile) {
    const enable = profile.role !== 'admin'
    if (
      !window.confirm(
        enable
          ? `Назначить «${profile.displayName}» администратором?`
          : `Снять права администратора у «${profile.displayName}»?`,
      )
    ) {
      return
    }

    setBusyUid(profile.uid)
    setError('')
    setMessage('')
    try {
      await setUserAdmin(profile.uid, enable)
      setMessage(
        enable
          ? `${profile.displayName}: назначен администратором.`
          : `${profile.displayName}: права администратора сняты.`,
      )
      await loadOverview(true)
    } catch (actionError) {
      setError(errorMessage(actionError))
    } finally {
      setBusyUid(null)
    }
  }

  const stats = [
    {
      title: 'На проверке',
      value: overview?.pendingTutors.length ?? 0,
      icon: Clock3,
      accent: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Активные репетиторы',
      value: overview?.activeTutorsCount ?? 0,
      icon: UserRoundCheck,
      accent: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Активные студенты',
      value: overview?.studentsCount ?? 0,
      icon: GraduationCap,
      accent: 'bg-violet-100 text-violet-700',
    },
    {
      title: 'Всего пользователей',
      value: overview?.totalUsers ?? 0,
      icon: UsersRound,
      accent: 'bg-sky-100 text-sky-700',
    },
  ]

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">
              Администрирование
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
              <ShieldCheck className="h-4 w-4" />
              {role === 'owner' ? 'Владелец' : 'Администратор'}
            </span>
          </div>
          <p className="mt-2 text-slate-500">
            Проверяйте анкеты репетиторов перед публикацией в каталоге.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loading || Boolean(busyUid)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ title, value, icon: Icon, accent }) => (
          <article
            key={title}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {loading ? '—' : value}
                </p>
              </div>
              <div className={`rounded-2xl p-3 ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Репетиторы на проверке
            </h2>
            <p className="mt-1 text-slate-500">
              Одобрение делает профиль активным и видимым студентам.
            </p>
          </div>
          {!loading && overview && overview.rejectedTutorsCount > 0 && (
            <p className="text-sm text-slate-500">
              Отклонено ранее: {overview.rejectedTutorsCount}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white">
            <LoaderCircle className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        ) : overview?.pendingTutors.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {overview.pendingTutors.map((tutor) => {
              const isBusy = busyUid === tutor.uid
              const isRejecting = rejectingUid === tutor.uid

              return (
                <article
                  key={tutor.uid}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">
                      {initials(tutor)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">
                          {tutor.displayName || 'Имя не указано'}
                        </h3>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          На проверке
                        </span>
                      </div>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {tutor.email}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Специализация
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-800">
                        {tutor.specialization || 'Не указана'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Опыт
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-800">
                        {tutor.experience || 'Не указан'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Учреждение
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-800">
                        {tutor.institution || 'Не указано'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Подтверждение квалификации
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-800">
                        {overview.tutorPrivateProfiles[tutor.uid]
                          ?.qualificationReference || 'Не указано'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-slate-700">
                      О себе
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {tutor.bio || 'Описание не заполнено.'}
                    </p>
                  </div>

                  {isRejecting ? (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <label
                        htmlFor={`reason-${tutor.uid}`}
                        className="text-sm font-semibold text-red-800"
                      >
                        Причина отклонения
                      </label>
                      <textarea
                        id={`reason-${tutor.uid}`}
                        value={rejectionReason}
                        onChange={(event) =>
                          setRejectionReason(event.target.value)
                        }
                        placeholder="Например: добавьте сведения об образовании"
                        rows={3}
                        autoFocus
                        className="mt-2 w-full resize-none rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                      />
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => void applyDecision(tutor, 'reject')}
                          disabled={isBusy}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Подтвердить отклонение
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingUid(null)
                            setRejectionReason('')
                          }}
                          disabled={isBusy}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 font-semibold text-red-700"
                        >
                          <X className="h-4 w-4" />
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void applyDecision(tutor, 'approve')}
                        disabled={Boolean(busyUid)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBusy ? (
                          <LoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                          <Check className="h-5 w-5" />
                        )}
                        Одобрить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingUid(tutor.uid)
                          setRejectionReason('')
                          setError('')
                          setMessage('')
                        }}
                        disabled={Boolean(busyUid)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-5 w-5" />
                        Отклонить
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center">
            <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" />
            <h3 className="mt-4 text-xl font-bold text-slate-900">
              Все анкеты проверены
            </h3>
            <p className="mt-2 text-slate-600">
              Новые репетиторы появятся здесь сразу после регистрации.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Пользователи</h2>
            <p className="mt-1 text-slate-500">
              {role === 'owner'
                ? 'Владелец может управлять доступом и назначать администраторов.'
                : 'Просмотр активных и заблокированных аккаунтов.'}
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:w-80">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Имя или email"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        {!loading && overview && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600">
              Всего: {overview.totalUsers}
            </span>
            <span className="rounded-full bg-red-50 px-3 py-1.5 font-medium text-red-600">
              Заблокировано: {overview.blockedUsersCount}
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <LoaderCircle className="h-7 w-7 animate-spin text-violet-600" />
            </div>
          ) : overview?.users.length ? (
            <div className="divide-y divide-slate-100">
              {overview.users
                .filter((profile) => {
                  const term = userSearch.trim().toLowerCase()
                  return (
                    !term ||
                    `${profile.displayName} ${profile.email}`
                      .toLowerCase()
                      .includes(term)
                  )
                })
                .map((profile) => {
                  const owner = profile.uid === PRIMARY_OWNER_UID
                  const busy = busyUid === profile.uid
                  const roleName = owner
                    ? 'Владелец'
                    : profile.role === 'admin'
                      ? 'Администратор'
                      : profile.role === 'tutor'
                        ? 'Репетитор'
                        : 'Студент'
                  const statusName =
                    profile.status === 'active'
                      ? 'Активен'
                      : profile.status === 'pending'
                        ? 'На проверке'
                        : profile.status === 'rejected'
                          ? 'Доработка'
                          : profile.status === 'blocked'
                            ? 'Заблокирован'
                            : 'Удалён'

                  return (
                    <article
                      key={profile.uid}
                      className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {profile.avatar ? (
                          <ProfilePhoto
                            src={profile.avatar}
                            size={48}
                            className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 font-bold text-violet-700">
                            {initials(profile)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-bold text-slate-900">
                              {profile.displayName || 'Имя не указано'}
                            </h3>
                            {owner && (
                              <ShieldCheck className="h-4 w-4 text-violet-600" />
                            )}
                          </div>
                          <p className="truncate text-sm text-slate-500">
                            {profile.email}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="text-violet-700">{roleName}</span>
                            <span
                              className={
                                profile.status === 'blocked'
                                  ? 'text-red-600'
                                  : 'text-slate-500'
                              }
                            >
                              {statusName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {role === 'owner' && !owner && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {(profile.role === 'student' ||
                            profile.role === 'admin') &&
                            profile.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => void toggleAdmin(profile)}
                                disabled={Boolean(busyUid)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 disabled:opacity-50"
                              >
                                {busy ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserCog className="h-4 w-4" />
                                )}
                                {profile.role === 'admin'
                                  ? 'Снять права'
                                  : 'Сделать админом'}
                              </button>
                            )}
                          {profile.status !== 'deleted' && (
                            <button
                              type="button"
                              onClick={() => void toggleBlocked(profile)}
                              disabled={Boolean(busyUid)}
                              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                                profile.status === 'blocked'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-600'
                              }`}
                            >
                              {busy ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : profile.status === 'blocked' ? (
                                <CircleCheck className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                              {profile.status === 'blocked'
                                ? 'Восстановить'
                                : 'Заблокировать'}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Пользователи не найдены.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
