'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Archive,
  Ban,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Database,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  UserCog,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import PresenceBadge from '@/components/presence/PresenceBadge'
import {
  fetchAdminControlOverview,
  runAdminControlAction,
  type AdminActionInput,
  type AdminAuditRecord,
  type AdminBookingRecord,
  type AdminOverviewResponse,
  type AdminOverviewTab,
  type AdminUserRecord,
} from '@/lib/admin-control'
import type { BookingStatus } from '@/lib/domain'
import { LEARNER_TRACK_LABELS, SCHOOL_EXAM_LABELS } from '@/lib/education'
import type { UserRole, UserStatus } from '@/lib/user-profile'

const roleLabels: Record<AdminUserRecord['role'], string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  moderator: 'Модератор',
  tutor: 'Репетитор',
  student: 'Ученик',
}

const statusLabels: Record<UserStatus, string> = {
  active: 'Активен',
  pending: 'На проверке',
  rejected: 'Отклонён',
  suspended: 'Приостановлен',
  blocked: 'Заблокирован',
  deleted: 'В архиве',
}

const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: 'Ожидает решения',
  accepted: 'Подтверждено',
  declined: 'Отклонено',
  cancelled: 'Отменено',
  completed: 'Завершено',
}

const statusTone: Record<UserStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-amber-100 text-amber-900',
  blocked: 'bg-slate-200 text-slate-800',
  deleted: 'bg-slate-900 text-white',
}

const bookingTone: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-sky-100 text-sky-800',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-200 text-slate-700',
  completed: 'bg-emerald-100 text-emerald-800',
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100'

function formatDate(value: string, includeTime = true) {
  if (!value) return 'Нет данных'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

function initials(user: AdminUserRecord) {
  return (
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() ||
    user.displayName.slice(0, 1).toUpperCase() ||
    'П'
  )
}

function money(value: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.max(0, value || 0)) + ' ₽'
}

function StatCard({
  title,
  value,
  note,
  icon: Icon,
  accent,
}: {
  title: string
  value: number | string
  note: string
  icon: typeof UsersRound
  accent: string
}) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{note}</p>
        </div>
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accent}`}
        >
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </article>
  )
}

interface ConfirmState {
  title: string
  description: string
  confirmLabel: string
  tone: 'primary' | 'danger'
  input: AdminActionInput
  requireWord?: string
}

function ConfirmDialog({
  state,
  busy,
  onClose,
  onConfirm,
}: {
  state: ConfirmState
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const [word, setWord] = useState('')
  const allowed = !state.requireWord || word.trim() === state.requireWord

  useEffect(() => setWord(''), [state])

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-lg rounded-[30px] border border-white/20 bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                state.tone === 'danger'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {state.tone === 'danger' ? (
                <ShieldAlert className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </span>
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              {state.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {state.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="ms-icon-btn ms-icon-btn-neutral shrink-0"
            aria-label="Закрыть подтверждение"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.requireWord && (
          <label className="mt-5 block space-y-2 text-sm font-black text-slate-700">
            Для подтверждения введите: {state.requireWord}
            <input
              value={word}
              onChange={(event) => setWord(event.target.value)}
              className={inputClass}
              autoComplete="off"
            />
          </label>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="ms-btn ms-btn-secondary"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !allowed}
            className={`ms-btn ${state.tone === 'danger' ? 'ms-btn-danger' : 'ms-btn-primary'}`}
          >
            {busy ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function UserAvatar({ user }: { user: AdminUserRecord }) {
  if (user.avatar) {
    return (
      <ProfilePhoto
        src={user.avatar}
        size={48}
        className="h-12 w-12 shrink-0 rounded-2xl object-cover"
      />
    )
  }
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-teal-100 font-black text-teal-800">
      {initials(user)}
    </span>
  )
}

export default function AdminPage() {
  const { role } = useAuth()
  const allowed = role === 'admin' || role === 'owner'
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null)
  const [activeTab, setActiveTab] = useState<AdminOverviewTab>('overview')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | AdminUserRecord['role']>(
    'all',
  )
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [bookingFilter, setBookingFilter] = useState<'all' | BookingStatus>(
    'all',
  )
  const [rejectingUid, setRejectingUid] = useState('')
  const [rejectionNote, setRejectionNote] = useState('')

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!allowed) {
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      setError('')
      try {
        setOverview(await fetchAdminControlOverview())
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Не удалось загрузить центр управления.',
        )
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [allowed],
  )

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const users = useMemo(() => {
    const query = userSearch.trim().toLocaleLowerCase('ru-RU')
    return (overview?.users || []).filter((user) => {
      const matchesQuery =
        !query ||
        [
          user.displayName,
          user.email,
          user.specialization,
          user.institution,
          user.city,
          user.uid,
          ...user.subjects,
          ...user.examTypes.map((exam) => SCHOOL_EXAM_LABELS[exam]),
        ]
          .join(' ')
          .toLocaleLowerCase('ru-RU')
          .includes(query)
      return (
        matchesQuery &&
        (roleFilter === 'all' || user.role === roleFilter) &&
        (statusFilter === 'all' || user.status === statusFilter)
      )
    })
  }, [overview?.users, roleFilter, statusFilter, userSearch])

  const bookings = useMemo(
    () =>
      (overview?.bookings || []).filter(
        (booking) =>
          bookingFilter === 'all' || booking.status === bookingFilter,
      ),
    [bookingFilter, overview?.bookings],
  )

  if (!allowed) {
    return (
      <div className="rounded-[30px] border border-red-200 bg-red-50 p-8 text-red-800">
        <div className="flex items-start gap-4">
          <ShieldAlert className="mt-1 h-7 w-7 shrink-0" />
          <div>
            <h1 className="text-xl font-black">Доступ запрещён</h1>
            <p className="mt-2 text-sm leading-6">
              Центр управления доступен только владельцу MedStart и назначенным
              администраторам.
            </p>
          </div>
        </div>
      </div>
    )
  }

  async function execute(input: AdminActionInput) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await runAdminControlAction(input)
      setMessage(result.message)
      setConfirmState(null)
      setRejectingUid('')
      setRejectionNote('')
      await loadOverview(true)
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Операция не выполнена.',
      )
    } finally {
      setBusy(false)
    }
  }

  function ask(state: ConfirmState) {
    setError('')
    setMessage('')
    setConfirmState(state)
  }

  const tabs: Array<{
    id: AdminOverviewTab
    name: string
    icon: typeof LayoutDashboard
    count?: number
    ownerOnly?: boolean
  }> = [
    { id: 'overview', name: 'Обзор', icon: LayoutDashboard },
    {
      id: 'moderation',
      name: 'Модерация',
      icon: FileCheck2,
      count: overview?.stats.pendingTutors,
    },
    {
      id: 'users',
      name: 'Пользователи',
      icon: UsersRound,
      count: overview?.stats.totalUsers,
    },
    {
      id: 'bookings',
      name: 'Занятия',
      icon: CalendarDays,
      count: overview?.stats.activeBookings,
    },
    { id: 'audit', name: 'Журнал действий', icon: ScrollText, ownerOnly: true },
    { id: 'system', name: 'Система', icon: Server },
  ]

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-7 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ring-1 ring-white/15">
              <ShieldCheck className="h-4 w-4 text-cyan-200" />
              {overview?.actor.role === 'owner'
                ? 'Контур владельца'
                : 'Панель администратора'}
            </span>
            <h1 className="mt-5 max-w-3xl text-3xl font-black sm:text-4xl">
              Центр управления MedStart
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-teal-50/80 sm:text-base">
              Пользователи, репетиторы, занятия, материалы, безопасность и
              история вмешательств — в одном защищённом рабочем пространстве.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold ring-1 ring-white/15">
                <LockKeyhole className="h-4 w-4 text-cyan-200" />
                UID владельца защищён
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold ring-1 ring-white/15">
                <ScrollText className="h-4 w-4 text-cyan-200" />
                Действия журналируются
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={loading || busy}
            className="ms-btn ms-btn-white"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Обновить данные
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">{message}</p>
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
        {tabs
          .filter((tab) => !tab.ownerOnly || overview?.capabilities.viewAudit)
          .map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
                className="ms-choice ms-choice-pill shrink-0"
              >
                <Icon className="h-4 w-4" />
                {tab.name}
                {typeof tab.count === 'number' && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
      </nav>

      {loading || !overview ? (
        <div className="flex min-h-72 items-center justify-center rounded-[30px] border border-slate-200 bg-white">
          <LoaderCircle className="h-9 w-9 animate-spin text-teal-700" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewPanel overview={overview} onTab={setActiveTab} />
          )}

          {activeTab === 'moderation' && (
            <ModerationPanel
              users={overview.pendingTutors}
              busy={busy}
              rejectingUid={rejectingUid}
              rejectionNote={rejectionNote}
              onRejecting={setRejectingUid}
              onNote={setRejectionNote}
              onApprove={(user) =>
                ask({
                  title: 'Одобрить анкету репетитора?',
                  description: `Профиль «${user.displayName}» станет активным и появится в каталоге студентов.`,
                  confirmLabel: 'Одобрить и опубликовать',
                  tone: 'primary',
                  input: {
                    action: 'moderate_tutor',
                    targetUid: user.uid,
                    decision: 'approve',
                  },
                })
              }
              onReject={(user) =>
                void execute({
                  action: 'moderate_tutor',
                  targetUid: user.uid,
                  decision: 'reject',
                  note: rejectionNote,
                })
              }
            />
          )}

          {activeTab === 'users' && (
            <UsersPanel
              users={users}
              overview={overview}
              search={userSearch}
              roleFilter={roleFilter}
              statusFilter={statusFilter}
              onSearch={setUserSearch}
              onRoleFilter={setRoleFilter}
              onStatusFilter={setStatusFilter}
              onAsk={ask}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingsPanel
              bookings={bookings}
              filter={bookingFilter}
              ownerControl={overview.capabilities.manageBookings}
              onFilter={setBookingFilter}
              onAsk={ask}
            />
          )}

          {activeTab === 'audit' && overview.capabilities.viewAudit && (
            <AuditPanel audit={overview.audit} />
          )}

          {activeTab === 'system' && <SystemPanel overview={overview} />}
        </>
      )}

      {confirmState && (
        <ConfirmDialog
          state={confirmState}
          busy={busy}
          onClose={() => !busy && setConfirmState(null)}
          onConfirm={() => void execute(confirmState.input)}
        />
      )}
    </div>
  )
}

function OverviewPanel({
  overview,
  onTab,
}: {
  overview: AdminOverviewResponse
  onTab: (tab: AdminOverviewTab) => void
}) {
  const { stats } = overview
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Пользователи"
          value={stats.totalUsers}
          note={`${stats.activeStudents} учеников · ${stats.activeTutors} репетиторов`}
          icon={UsersRound}
          accent="bg-sky-100 text-sky-800"
        />
        <StatCard
          title="Требует решения"
          value={stats.pendingTutors + stats.pendingKnowledge}
          note={`${stats.pendingTutors} анкет · ${stats.pendingKnowledge} материалов`}
          icon={Clock3}
          accent="bg-amber-100 text-amber-800"
        />
        <StatCard
          title="Активные занятия"
          value={stats.activeBookings}
          note={`${stats.completedBookings} завершено · ${stats.totalBookings} всего`}
          icon={CalendarClock}
          accent="bg-teal-100 text-teal-800"
        />
        <StatCard
          title="Ограниченный доступ"
          value={stats.blockedUsers + stats.archivedUsers}
          note={`${stats.blockedUsers} заблокировано · ${stats.archivedUsers} в архиве`}
          icon={ShieldAlert}
          accent="bg-red-100 text-red-800"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-teal-800">
                <Activity className="h-4 w-4" />
                Операционный центр
              </span>
              <h2 className="mt-4 text-2xl font-black text-slate-950">
                Что требует внимания сейчас
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Быстрый переход к задачам, которые влияют на доступ
                пользователей и работу платформы.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              {
                title: 'Проверить репетиторов',
                note: `${stats.pendingTutors} анкет ожидают решения`,
                icon: Stethoscope,
                tab: 'moderation' as AdminOverviewTab,
              },
              {
                title: 'Управление доступом',
                note: `${stats.blockedUsers} заблокировано, ${stats.archivedUsers} в архиве`,
                icon: UserCog,
                tab: 'users' as AdminOverviewTab,
              },
              {
                title: 'Контроль занятий',
                note: `${stats.activeBookings} активных записей`,
                icon: CalendarDays,
                tab: 'bookings' as AdminOverviewTab,
              },
              {
                title: 'Учебные материалы',
                note: `${stats.pendingKnowledge} публикаций на модерации`,
                icon: BookOpenCheck,
                href: '/dashboard/knowledge',
              },
            ].map((item) => {
              const Icon = item.icon
              const className =
                'ms-row-action group flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-teal-200 hover:bg-teal-50'
              const content = (
                <>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-teal-800 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-slate-950">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {item.note}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
                </>
              )
              return item.href ? (
                <Link key={item.title} href={item.href} className={className}>
                  {content}
                </Link>
              ) : (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => onTab(item.tab!)}
                  className={`ms-row-action ${className}`}
                >
                  {content}
                </button>
              )
            })}
          </div>
        </article>

        <article className="rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <ShieldCheck className="h-10 w-10 text-cyan-300" />
          <h2 className="mt-5 text-2xl font-black">Контур полномочий</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {overview.capabilities.ownerControl
              ? 'Вы вошли как владелец. Доступны роли, архивирование, подтверждение почты, контроль занятий и полный журнал действий.'
              : 'Вы вошли как администратор. Доступна модерация и работа с обычными пользователями, но права владельца и других администраторов защищены.'}
          </p>
          <div className="mt-6 space-y-3 text-sm">
            {[
              ['Firebase Admin', overview.system.firebaseAdmin],
              ['Аккаунт владельца', overview.system.ownerAuth],
              ['Профиль владельца', overview.system.ownerProfile],
              ['Защита владельца', overview.system.ownerProtected],
            ].map(([label, ready]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/7 px-4 py-3"
              >
                <span className="font-bold text-slate-200">
                  {String(label)}
                </span>
                {ready ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-300" />
                )}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

function ModerationPanel({
  users,
  busy,
  rejectingUid,
  rejectionNote,
  onRejecting,
  onNote,
  onApprove,
  onReject,
}: {
  users: AdminUserRecord[]
  busy: boolean
  rejectingUid: string
  rejectionNote: string
  onRejecting: (uid: string) => void
  onNote: (value: string) => void
  onApprove: (user: AdminUserRecord) => void
  onReject: (user: AdminUserRecord) => void
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">
            Модерация репетиторов
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Проверяйте специализацию, учреждение, опыт, описание подхода и
            подтверждение квалификации до публикации профиля.
          </p>
        </div>
        <Link href="/dashboard/knowledge" className="ms-btn ms-btn-secondary">
          <BookOpenCheck className="h-5 w-5" />
          Модерация учебной базы
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="rounded-[30px] border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />
          <h3 className="mt-4 text-xl font-black text-slate-950">
            Очередь пуста
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Новые анкеты появятся здесь автоматически.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {users.map((user) => {
            const rejecting = rejectingUid === user.uid
            return (
              <article
                key={user.uid}
                className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-slate-950">
                        {user.displayName}
                      </h3>
                      <PresenceBadge uid={user.uid} compact />
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                        На проверке
                      </span>
                    </div>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                <dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Специализация
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {user.specialization || 'Не указана'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Учреждение
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {user.institution || 'Не указано'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Ученики
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {user.tutorAudiences
                        .map((audience) => LEARNER_TRACK_LABELS[audience])
                        .join(', ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Экзамены
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {user.examTypes.length
                        ? user.examTypes
                            .map((exam) => SCHOOL_EXAM_LABELS[exam])
                            .join(', ')
                        : 'Не применимо'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Предметы
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {user.subjects.join(', ') || 'Не указаны'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Подтверждение квалификации
                    </dt>
                    <dd className="mt-1 break-words font-bold text-slate-800">
                      {user.qualificationReference || 'Не загружено'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                  <span
                    className={`rounded-full px-3 py-1.5 ${user.auth.emailVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {user.auth.emailVerified
                      ? 'Почта подтверждена'
                      : 'Почта не подтверждена'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                    Создан:{' '}
                    {formatDate(user.auth.createdAt || user.createdAt, false)}
                  </span>
                </div>

                {rejecting ? (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <label className="block text-sm font-black text-red-900">
                      Причина отклонения
                      <textarea
                        value={rejectionNote}
                        onChange={(event) => onNote(event.target.value)}
                        rows={4}
                        autoFocus
                        placeholder="Укажите, что необходимо исправить или подтвердить"
                        className="mt-2 w-full resize-none rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                      />
                    </label>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => onReject(user)}
                        disabled={busy || rejectionNote.trim().length < 3}
                        className="ms-btn ms-btn-danger"
                      >
                        <XCircle className="h-5 w-5" />
                        Отклонить анкету
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRejecting('')
                          onNote('')
                        }}
                        disabled={busy}
                        className="ms-btn ms-btn-secondary"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onApprove(user)}
                      disabled={busy}
                      className="ms-btn ms-btn-primary"
                    >
                      <Check className="h-5 w-5" />
                      Одобрить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRejecting(user.uid)
                        onNote('')
                      }}
                      disabled={busy}
                      className="ms-btn ms-btn-danger-outline"
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
      )}
    </section>
  )
}

function UsersPanel({
  users,
  overview,
  search,
  roleFilter,
  statusFilter,
  onSearch,
  onRoleFilter,
  onStatusFilter,
  onAsk,
}: {
  users: AdminUserRecord[]
  overview: AdminOverviewResponse
  search: string
  roleFilter: 'all' | AdminUserRecord['role']
  statusFilter: 'all' | UserStatus
  onSearch: (value: string) => void
  onRoleFilter: (value: 'all' | AdminUserRecord['role']) => void
  onStatusFilter: (value: 'all' | UserStatus) => void
  onAsk: (state: ConfirmState) => void
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-slate-950">
          Пользователи и доступ
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Управляйте доступом, ролями, подтверждением почты и активными
          сессиями. Владелец защищён от любых изменений.
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-sm font-black text-slate-700">
          <SlidersHorizontal className="h-4 w-4 text-teal-700" />
          Поиск и фильтры
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Имя, почта, UID, учреждение"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) =>
              onRoleFilter(event.target.value as typeof roleFilter)
            }
            className={inputClass}
          >
            <option value="all">Все роли</option>
            <option value="owner">Владелец</option>
            <option value="admin">Администраторы</option>
            <option value="moderator">Модераторы</option>
            <option value="tutor">Репетиторы</option>
            <option value="student">Ученики</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilter(event.target.value as typeof statusFilter)
            }
            className={inputClass}
          >
            <option value="all">Все статусы</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {users.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Пользователи не найдены.
          </div>
        ) : (
          users.map((user) => (
            <article
              key={user.uid}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-black text-slate-950">
                        {user.displayName}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${statusTone[user.status]}`}
                      >
                        {statusLabels[user.status]}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${user.role === 'owner' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                      >
                        {roleLabels[user.role]}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {user.email}
                    </p>
                    <p className="mt-2 break-all text-xs text-slate-400">
                      UID: {user.uid}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[430px]">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                      Почта
                    </p>
                    <p
                      className={`mt-1 text-sm font-black ${user.auth.emailVerified ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                      {user.auth.emailVerified
                        ? 'Подтверждена'
                        : 'Не подтверждена'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                      Firebase Auth
                    </p>
                    <p
                      className={`mt-1 text-sm font-black ${!user.auth.exists || user.auth.disabled ? 'text-red-700' : 'text-emerald-700'}`}
                    >
                      {!user.auth.exists
                        ? 'Нет аккаунта'
                        : user.auth.disabled
                          ? 'Отключён'
                          : 'Активен'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                      Последний вход
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-800">
                      {formatDate(user.auth.lastSignInAt)}
                    </p>
                  </div>
                </div>
              </div>

              {user.role === 'owner' ? (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-900">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-bold">
                    Основной владелец MedStart. Роль, доступ, Auth и профиль
                    защищены сервером и правилами Firebase.
                  </p>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      onAsk({
                        title:
                          user.status === 'blocked'
                            ? 'Восстановить доступ?'
                            : 'Заблокировать пользователя?',
                        description:
                          user.status === 'blocked'
                            ? `Firebase Authentication будет включён, а профиль «${user.displayName}» восстановлен в предыдущем статусе.`
                            : `Пользователь «${user.displayName}» будет отключён в Firebase Authentication, а все активные сессии — отозваны.`,
                        confirmLabel:
                          user.status === 'blocked'
                            ? 'Восстановить доступ'
                            : 'Заблокировать',
                        tone: user.status === 'blocked' ? 'primary' : 'danger',
                        input: {
                          action: 'set_blocked',
                          targetUid: user.uid,
                          blocked: user.status !== 'blocked',
                        },
                      })
                    }
                    disabled={
                      user.status === 'deleted' ||
                      (!overview.capabilities.ownerControl &&
                        ['admin', 'moderator'].includes(user.profileRole))
                    }
                    className={
                      user.status === 'blocked'
                        ? 'ms-btn ms-btn-secondary ms-btn-sm'
                        : 'ms-btn ms-btn-danger-outline ms-btn-sm'
                    }
                  >
                    {user.status === 'blocked' ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}
                    {user.status === 'blocked'
                      ? 'Восстановить'
                      : 'Заблокировать'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onAsk({
                        title: 'Отозвать все сессии?',
                        description: `Пользователь «${user.displayName}» будет вынужден войти в MedStart повторно на всех устройствах.`,
                        confirmLabel: 'Отозвать сессии',
                        tone: 'danger',
                        input: {
                          action: 'revoke_sessions',
                          targetUid: user.uid,
                        },
                      })
                    }
                    disabled={
                      !user.auth.exists ||
                      (!overview.capabilities.ownerControl &&
                        ['admin', 'moderator'].includes(user.profileRole))
                    }
                    className="ms-btn ms-btn-secondary ms-btn-sm"
                  >
                    <KeyRound className="h-4 w-4" />
                    Отозвать сессии
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onAsk({
                        title: 'Отправить восстановление пароля?',
                        description: `Firebase отправит письмо на ${user.email}. Пароль не будет виден администрации.`,
                        confirmLabel: 'Отправить письмо',
                        tone: 'primary',
                        input: {
                          action: 'send_password_reset',
                          targetUid: user.uid,
                        },
                      })
                    }
                    disabled={
                      !user.auth.exists ||
                      !user.email ||
                      (!overview.capabilities.ownerControl &&
                        ['admin', 'moderator'].includes(user.profileRole))
                    }
                    className="ms-btn ms-btn-secondary ms-btn-sm"
                  >
                    <KeyRound className="h-4 w-4" />
                    Сброс пароля
                  </button>

                  {overview.capabilities.verifyEmails &&
                    !user.auth.emailVerified && (
                      <button
                        type="button"
                        onClick={() =>
                          onAsk({
                            title: 'Подтвердить почту вручную?',
                            description: `Используйте это только после проверки, что адрес ${user.email} действительно принадлежит пользователю.`,
                            confirmLabel: 'Подтвердить почту',
                            tone: 'primary',
                            input: {
                              action: 'verify_email',
                              targetUid: user.uid,
                            },
                          })
                        }
                        className="ms-btn ms-btn-secondary ms-btn-sm"
                      >
                        <MailCheck className="h-4 w-4" />
                        Подтвердить почту
                      </button>
                    )}

                  {overview.capabilities.manageRoles &&
                    user.status !== 'blocked' &&
                    user.status !== 'deleted' && (
                      <RoleControl user={user} onAsk={onAsk} />
                    )}

                  {overview.capabilities.archiveUsers &&
                    (user.status === 'deleted' ? (
                      <button
                        type="button"
                        onClick={() =>
                          onAsk({
                            title: 'Восстановить аккаунт из архива?',
                            description: `Firebase Authentication будет включён. Репетитор после восстановления снова пройдёт модерацию.`,
                            confirmLabel: 'Восстановить аккаунт',
                            tone: 'primary',
                            input: {
                              action: 'restore_user',
                              targetUid: user.uid,
                            },
                          })
                        }
                        className="ms-btn ms-btn-secondary ms-btn-sm"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Из архива
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onAsk({
                            title: 'Архивировать аккаунт?',
                            description: `Аккаунт «${user.displayName}» будет отключён и скрыт. История занятий и служебные записи сохранятся для аудита.`,
                            confirmLabel: 'Архивировать',
                            tone: 'danger',
                            requireWord: 'АРХИВ',
                            input: {
                              action: 'archive_user',
                              targetUid: user.uid,
                            },
                          })
                        }
                        className="ms-btn ms-btn-danger-outline ms-btn-sm"
                      >
                        <Archive className="h-4 w-4" />В архив
                      </button>
                    ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function RoleControl({
  user,
  onAsk,
}: {
  user: AdminUserRecord
  onAsk: (state: ConfirmState) => void
}) {
  const [nextRole, setNextRole] = useState<UserRole>(user.profileRole)

  useEffect(() => {
    setNextRole(user.profileRole)
  }, [user.profileRole])

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
      <select
        value={nextRole}
        onChange={(event) => setNextRole(event.target.value as UserRole)}
        className="rounded-xl bg-transparent px-2 py-1.5 text-sm font-black text-slate-700 outline-none"
        aria-label={`Новая роль для ${user.displayName}`}
      >
        <option value="student">Ученик</option>
        <option value="tutor">Репетитор</option>
        <option value="admin">Администратор</option>
        <option value="moderator">Модератор</option>
      </select>
      <button
        type="button"
        onClick={() =>
          onAsk({
            title: 'Изменить роль пользователя?',
            description:
              nextRole === 'tutor'
                ? `Пользователь «${user.displayName}» станет репетитором и будет отправлен на обязательную модерацию.`
                : `Роль пользователя «${user.displayName}» будет изменена на «${nextRole === 'admin' ? 'Администратор' : nextRole === 'moderator' ? 'Модератор' : 'Ученик'}».`,
            confirmLabel: 'Изменить роль',
            tone: 'primary',
            input: { action: 'set_role', targetUid: user.uid, role: nextRole },
          })
        }
        disabled={nextRole === user.profileRole}
        className="ms-btn ms-btn-primary ms-btn-sm"
      >
        <UserCog className="h-4 w-4" />
        Применить
      </button>
    </div>
  )
}

function BookingsPanel({
  bookings,
  filter,
  ownerControl,
  onFilter,
  onAsk,
}: {
  bookings: AdminBookingRecord[]
  filter: 'all' | BookingStatus
  ownerControl: boolean
  onFilter: (value: 'all' | BookingStatus) => void
  onAsk: (state: ConfirmState) => void
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">
            Контроль занятий
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Просматривайте последние записи. Изменение статуса доступно только
            владельцу и должно использоваться для разрешения спорных или
            аварийных ситуаций.
          </p>
        </div>
        <select
          value={filter}
          onChange={(event) => onFilter(event.target.value as typeof filter)}
          className={`${inputClass} sm:w-64`}
        >
          <option value="all">Все статусы</option>
          {Object.entries(bookingStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Занятия по выбранному фильтру не найдены.
          </div>
        ) : (
          bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-slate-950">
                      {booking.subject || 'Медицинское занятие'}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${bookingTone[booking.status]}`}
                    >
                      {bookingStatusLabels[booking.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-black">{booking.studentName}</span> →{' '}
                    <span className="font-black">{booking.tutorName}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span>
                      {booking.requestedDate || 'Дата не указана'} ·{' '}
                      {booking.requestedTime || '—'}
                    </span>
                    <span>
                      {booking.format === 'in_person' ? 'Очно' : 'Онлайн'}
                    </span>
                    <span>{money(booking.price)}</span>
                    <span>ID: {booking.id}</span>
                  </div>
                </div>

                {ownerControl ? (
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        'pending',
                        'accepted',
                        'completed',
                        'cancelled',
                      ] as BookingStatus[]
                    )
                      .filter((status) => status !== booking.status)
                      .map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            onAsk({
                              title: 'Изменить статус занятия?',
                              description: `Статус занятия «${booking.subject || booking.id}» будет изменён: «${bookingStatusLabels[booking.status]}» → «${bookingStatusLabels[status]}».`,
                              confirmLabel: bookingStatusLabels[status],
                              tone:
                                status === 'cancelled' ? 'danger' : 'primary',
                              input: {
                                action: 'set_booking_status',
                                bookingId: booking.id,
                                status,
                              },
                            })
                          }
                          className={
                            status === 'cancelled'
                              ? 'ms-btn ms-btn-danger-outline ms-btn-sm'
                              : 'ms-btn ms-btn-secondary ms-btn-sm'
                          }
                        >
                          {bookingStatusLabels[status]}
                        </button>
                      ))}
                  </div>
                ) : (
                  <span className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                    Только просмотр
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function AuditPanel({ audit }: { audit: AdminAuditRecord[] }) {
  const actionLabels: Record<string, string> = {
    tutor_approve: 'Репетитор одобрен',
    tutor_reject: 'Репетитор отклонён',
    user_blocked: 'Пользователь заблокирован',
    user_unblocked: 'Пользователь восстановлен',
    user_role_changed: 'Изменена роль',
    sessions_revoked: 'Отозваны сессии',
    password_reset_sent: 'Отправлен сброс пароля',
    email_verified_by_owner: 'Почта подтверждена владельцем',
    user_archived: 'Аккаунт архивирован',
    user_restored: 'Аккаунт восстановлен',
    booking_status_changed: 'Изменён статус занятия',
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-slate-950">
          Журнал административных действий
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Неизменяемая история критических операций: кто, когда и над каким
          объектом выполнил действие.
        </p>
      </div>

      {audit.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Административных действий пока нет.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          {audit.map((item, index) => (
            <article
              key={item.id}
              className={`p-5 ${index ? 'border-t border-slate-100' : ''}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-800">
                      {actionLabels[item.action] || item.action}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                      {item.actorRole === 'owner'
                        ? 'Владелец'
                        : item.actorRole === 'moderator'
                          ? 'Модератор'
                          : 'Администратор'}
                    </span>
                  </div>
                  <p className="mt-3 font-black text-slate-950">
                    {item.summary}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.actorName} · {item.actorEmail || item.actorUid}
                  </p>
                  {item.targetUid && (
                    <p className="mt-1 break-all text-xs text-slate-400">
                      Объект: {item.targetType || 'record'} · {item.targetUid}
                    </p>
                  )}
                </div>
                <time className="shrink-0 text-sm font-bold text-slate-500">
                  {formatDate(item.createdAt)}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function SystemPanel({ overview }: { overview: AdminOverviewResponse }) {
  const checks = [
    {
      title: 'Firebase Admin SDK',
      ready: overview.system.firebaseAdmin,
      note: 'Серверные привилегированные операции',
      icon: Server,
    },
    {
      title: 'Проект Firebase',
      ready: overview.system.projectId === 'medstart-e9bfe',
      note: overview.system.projectId,
      icon: Database,
    },
    {
      title: 'Аккаунт владельца',
      ready: overview.system.ownerAuth,
      note: 'Firebase Authentication',
      icon: CircleUserRound,
    },
    {
      title: 'Профиль владельца',
      ready: overview.system.ownerProfile,
      note: 'Firestore /users',
      icon: ShieldCheck,
    },
  ]

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-950">
          Состояние системы
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Безопасная диагностика административного контура без отображения
          секретов, ключей или персональных токенов.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => {
          const Icon = check.icon
          return (
            <article
              key={check.title}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl ${check.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {check.ready ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <h3 className="mt-5 font-black text-slate-950">{check.title}</h3>
              <p className="mt-2 break-all text-sm text-slate-500">
                {check.note}
              </p>
            </article>
          )
        })}
      </div>

      <article className="rounded-[30px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-700 text-white">
            <LockKeyhole className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-xl font-black text-slate-950">
              Защита основного владельца
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              UID владельца закреплён в клиентском access-control, серверных
              административных маршрутах и Firestore Rules. Его нельзя
              заблокировать, архивировать, понизить или заменить через
              интерфейс.
            </p>
            <p className="mt-3 text-sm font-black text-teal-800">
              Последняя диагностика: {formatDate(overview.system.generatedAt)}
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/api/health/auth"
          className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200"
        >
          <Activity className="h-6 w-6 text-teal-700" />
          <h3 className="mt-4 font-black text-slate-950">
            Проверка авторизации
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Состояние Firebase Admin и владельца.
          </p>
        </Link>
        <Link
          href="/dashboard/knowledge"
          className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200"
        >
          <BookOpenCheck className="h-6 w-6 text-teal-700" />
          <h3 className="mt-4 font-black text-slate-950">Учебная база</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Материалы и очередь модерации.
          </p>
        </Link>
        <Link
          href="/dashboard/settings"
          className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200"
        >
          <SlidersHorizontal className="h-6 w-6 text-teal-700" />
          <h3 className="mt-4 font-black text-slate-950">Настройки аккаунта</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Безопасность и параметры владельца.
          </p>
        </Link>
      </div>
    </section>
  )
}
